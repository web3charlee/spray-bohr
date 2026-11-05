// TESTNET ONLY. Runs the full Spray flow on BOT Bohr testnet with throwaway wallets and writes an evidence table.
//   npm run demo:bohr            (optional flag: --fund=0.05  = BOT sent to each throwaway wallet for gas)
// This is technical evidence for BOT's review. It is NOT real user activity and must never be used to inflate mainnet numbers.
import fs from 'node:fs'
import path from 'node:path'
import { formatUnits, parseEther, parseUnits } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  DEPLOY_DIR, explorerAddress, explorerTx, fail, getNetwork, loadAccount, loadArtifact,
  makeClients, preflight, readDeployment, sleep,
} from './lib.mjs'

if (process.argv[2] && process.argv[2] !== 'bohr') fail('The scripted demo only runs on the testnet (bohr). It will not run on mainnet.')
const net = getNetwork('bohr')
if (!net.testnet) fail('Refusing to run on a non-testnet.')
const fundArg = process.argv.find(a => a.startsWith('--fund='))
const FUND = parseEther(fundArg ? fundArg.split('=')[1] : '0.05')

const dep = readDeployment('bohr')
const deployer = loadAccount()
const spray = loadArtifact('Spray')
const token = loadArtifact('TestUSDC')
const { publicClient, walletClient: deployerWallet } = makeClients(net, deployer)
await preflight(net, publicClient, deployer.address)

const U = n => parseUnits(String(n), 6)
const mk = () => privateKeyToAccount(generatePrivateKey())
const [host, guest, alice, bob] = [mk(), mk(), mk(), mk()]
const wallets = new Map()
const walletFor = acct => {
  if (!wallets.has(acct.address)) wallets.set(acct.address, makeClients(net, acct).walletClient)
  return wallets.get(acct.address)
}

const rows = []
// Throws on failure (used where we want to retry).
async function sendTx(label, acct, address, abi, functionName, args = []) {
  const hash = await walletFor(acct).writeContract({ address, abi, functionName, args })
  const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  if (r.status !== 'success') throw new Error('transaction reverted')
  rows.push({ label, hash })
  return hash
}
// Stops the whole demo on failure.
async function send(label, acct, address, abi, functionName, args = []) {
  process.stdout.write(`- ${label} ... `)
  try {
    const hash = await sendTx(label, acct, address, abi, functionName, args)
    console.log('ok')
    return hash
  } catch (e) {
    console.log('FAILED')
    fail(`${label}: ${e.shortMessage || e.message}`)
  }
}
const read = (address, abi, functionName, args = []) => publicClient.readContract({ address, abi, functionName, args })

console.log(`\n=== Scripted Spray demo on ${net.name} ===`)
console.log(`Spray ${dep.spray}\nTestUSDC ${dep.token}\n`)

// 1. Gas for the throwaway wallets
for (const [name, a] of [['host', host], ['guest', guest], ['alice', alice], ['bob', bob]]) {
  process.stdout.write(`- fund ${name} with gas ... `)
  const hash = await deployerWallet.sendTransaction({ to: a.address, value: FUND })
  await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  console.log('ok')
}

// 2. Faucet
await send('Guest claims 100 tUSDC', guest, dep.token, token.abi, 'claim')

// 3. LIVE event
const liveId = await read(dep.spray, spray.abi, 'nextEventId')
await send('Host creates LIVE event (alice 70% / bob 30%)', host, dep.spray, spray.abi, 'createEvent',
  ['Demo wedding (live)', [alice.address, bob.address], [7000, 3000], 0, 0n, 1600n])
await send('Guest approves tUSDC', guest, dep.token, token.abi, 'approve', [dep.spray, U(50)])
await send('Guest sprays 5 tUSDC into the LIVE event', guest, dep.spray, spray.abi, 'spray', [liveId, U(5), 'Chioma'])
const aliceBal = await read(dep.spray, spray.abi, 'balance', [alice.address])
await send('Alice withdraws her share', alice, dep.spray, spray.abi, 'withdraw')

// 4. POT event: escrow, then settle
const potId = await read(dep.spray, spray.abi, 'nextEventId')
const chainNow = (await publicClient.getBlock()).timestamp // use chain time, not this computer's clock
const unlockAt = chainNow + 120n
await send('Host creates POT event (unlocks in ~2 min)', host, dep.spray, spray.abi, 'createEvent',
  ['Demo naming ceremony (pot)', [alice.address, bob.address], [5000, 5000], 1, unlockAt, 1600n])
await send('Guest sprays 10 tUSDC into the POT', guest, dep.spray, spray.abi, 'spray', [potId, U(10), 'Chioma'])
console.log('  waiting for the unlock time (about 2 minutes, measured in chain time) ...')
// The contract compares against the latest BLOCK time, so wait on that, not on this computer's clock.
for (let waited = 0; waited < 900; waited += 5) {
  const latest = await publicClient.getBlock()
  if (latest.timestamp > unlockAt) break
  await sleep(5000)
}
process.stdout.write('- Anyone settles the POT after unlock ... ')
let settled = false
let lastErr
for (let i = 0; i < 12 && !settled; i++) {
  try {
    await sendTx('Anyone settles the POT after unlock', guest, dep.spray, spray.abi, 'settle', [potId])
    settled = true
  } catch (e) {
    lastErr = e
    await sleep(5000)
  }
}
if (!settled) {
  console.log('FAILED')
  fail(`Settle did not go through: ${lastErr?.shortMessage || lastErr?.message}. Is the chain producing new blocks?`)
}
console.log('ok')
await send('Bob withdraws his share', bob, dep.spray, spray.abi, 'withdraw')

// 5. Cancel + refund
const potId2 = await read(dep.spray, spray.abi, 'nextEventId')
await send('Host creates a second POT (unlocks in 1 hour)', host, dep.spray, spray.abi, 'createEvent',
  ['Demo pot to cancel', [alice.address], [10000], 1, chainNow + 3600n, 1600n])
await send('Guest sprays 5 tUSDC into it', guest, dep.spray, spray.abi, 'spray', [potId2, U(5), 'Chioma'])
await send('Host cancels the POT', host, dep.spray, spray.abi, 'cancelEvent', [potId2])
await send('Guest refunds their contribution', guest, dep.spray, spray.abi, 'refund', [potId2])

const guestEnd = await read(dep.token, token.abi, 'balanceOf', [guest.address])
const md = [
  `# Spray scripted demo on ${net.name}`,
  '',
  `Spray: ${explorerAddress(net, dep.spray)}`,
  `TestUSDC: ${explorerAddress(net, dep.token)}`,
  '',
  `Alice's LIVE share before withdrawing: ${formatUnits(aliceBal, 6)} tUSDC. Guest ended with ${formatUnits(guestEnd, 6)} tUSDC (started with 100; 15 sprayed and paid out, 5 refunded).`,
  '',
  '| # | Step | Transaction |',
  '|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | ${r.label} | ${explorerTx(net, r.hash)} |`),
  '',
  'Throwaway wallets, testnet only. Technical evidence, not real user activity.',
  '',
].join('\n')
fs.mkdirSync(DEPLOY_DIR, { recursive: true })
const out = path.join(DEPLOY_DIR, 'bohr-demo-evidence.md')
fs.writeFileSync(out, md)
console.log(`\nAll steps passed. Evidence table saved to ${out}\n`)
