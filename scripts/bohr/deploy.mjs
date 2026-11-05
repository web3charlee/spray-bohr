// Deploys Spray to BOT Chain.
//   npm run deploy:bohr         -> BOT Bohr testnet: deploys TestUSDC (6 decimals) + Spray
//   npm run deploy:botmainnet   -> BOT Chain mainnet: deploys Spray only, pointed at BOT's USDT.
//                                  Refuses to continue unless that token has exactly 6 decimals.
// Needs DEPLOYER_KEY in the environment (never in a file). Writes deployments/<network>.json and updates .env (public values only).
import fs from 'node:fs'
import { erc20Abi, formatEther, isAddress } from 'viem'
import { compileAll } from './compile.mjs'
import {
  BUILD_DIR, ask, explorerAddress, explorerTx, fail, getNetwork, loadAccount, loadArtifact,
  makeClients, preflight, writeDeployment, writeEnv,
} from './lib.mjs'

const netKey = process.argv[2]
const flags = new Set(process.argv.slice(3))
const net = getNetwork(netKey)
const account = loadAccount()
const { publicClient, walletClient } = makeClients(net, account)

console.log(`\n=== Deploy Spray to ${net.name} (chain ${net.chainId}) ===`)
console.log(`RPC: ${net.rpc}`)

if (!fs.existsSync(BUILD_DIR)) compileAll()
const balance = await preflight(net, publicClient, account.address)
console.log(`Deployer: ${account.address}`)
console.log(`Balance : ${formatEther(balance)} BOT`)
if (balance === 0n) fail(`This wallet has no BOT for gas.${net.gasFaucet ? ' Get some from ' + net.gasFaucet : ''}`)

async function deploy(label, artifactName, args = []) {
  const art = loadArtifact(artifactName)
  console.log(`\nDeploying ${label} ...`)
  let hash
  try {
    hash = await walletClient.deployContract({ abi: art.abi, bytecode: art.bytecode, args })
  } catch (e) {
    fail(`Sending the ${label} deploy failed: ${e.shortMessage || e.message}`)
  }
  console.log(`  tx: ${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
  if (receipt.status !== 'success' || !receipt.contractAddress) fail(`${label} deploy transaction failed: ${explorerTx(net, hash)}`)
  console.log(`  ${label}: ${receipt.contractAddress} (block ${receipt.blockNumber})`)
  return { address: receipt.contractAddress, hash, block: receipt.blockNumber }
}

let tokenAddress
let tokenDeploy = null
if (net.testnet) {
  tokenDeploy = await deploy('TestUSDC', 'TestUSDC')
  tokenAddress = tokenDeploy.address
} else {
  tokenAddress = (process.env.RPC_URL && process.env.TEST_TOKEN_ADDRESS) || net.token // override only works against a local test RPC
  if (!isAddress(tokenAddress)) fail('Token address is not valid.')
  const code = await publicClient.getCode({ address: tokenAddress })
  if (!code || code === '0x') fail(`No contract found at the token address ${tokenAddress} on ${net.name}. Stopping.`)
  let decimals, symbol
  try {
    decimals = await publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' })
    symbol = await publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'symbol' })
  } catch {
    fail('Could not read decimals()/symbol() from the token. Stopping.')
  }
  console.log(`\nToken: ${symbol} at ${tokenAddress} -> ${decimals} decimals`)
  if (decimals !== 6) {
    fail(
      `This token has ${decimals} decimals, but Spray's limits are written for 6 (min 0.10, max 20, cap 200).\n` +
        'Deploying would make those limits wrong by a huge factor. Do NOT deploy this version; ask me to adapt the contract first.',
    )
  }
  console.log('\nTHIS IS MAINNET. Real money. Spray is unaudited (per-spray max 20, per-event cap 200 tokens).')
  if (!flags.has('--yes')) {
    const answer = await ask('Type DEPLOY MAINNET to continue: ')
    if (answer !== 'DEPLOY MAINNET') fail('Cancelled. Nothing was deployed.')
  }
}

const spray = await deploy('Spray', 'Spray', [tokenAddress])

// Post-deploy sanity check: Spray must point at the token.
const wired = await publicClient.readContract({ address: spray.address, abi: loadArtifact('Spray').abi, functionName: 'usdc' })
if (wired.toLowerCase() !== tokenAddress.toLowerCase()) fail('Spray reports a different token than expected. Do not use this deployment.')

const record = {
  network: net.key,
  chainId: net.chainId,
  deployer: account.address,
  token: tokenAddress,
  spray: spray.address,
  deployBlock: Number(spray.block),
  txs: { token: tokenDeploy?.hash ?? null, spray: spray.hash },
  deployedAt: new Date().toISOString(),
}
writeDeployment(net.key, record)
const envValues = { VITE_NETWORK: net.key, VITE_SPRAY_ADDRESS: spray.address, VITE_SPRAY_DEPLOY_BLOCK: String(spray.block) }
if (net.testnet) envValues.VITE_TOKEN_ADDRESS = tokenAddress
const envFile = writeEnv(envValues)

console.log('\n=== Done ===')
if (tokenDeploy) console.log(`TestUSDC : ${explorerAddress(net, tokenAddress)}`)
console.log(`Spray    : ${explorerAddress(net, spray.address)}`)
console.log(`Deploy tx: ${explorerTx(net, spray.hash)}`)
console.log(`\nSaved deployments/${net.key}.json and updated ${envFile} (public values only).`)
console.log('\nNext:')
console.log('  1. npm run dev                 (try the app locally)')
console.log(net.testnet ? '  2. npm run demo:bohr           (optional: scripted on-chain evidence)' : '  2. Use the app with real users, then collect the explorer links.')
console.log('  3. Netlify: set the same VITE_ values from .env in the site settings, build command "npm run build".')
console.log('  4. Verify the contracts on the explorer (solc 0.8.28, optimizer 200 runs, via-IR on, EVM paris).\n')
