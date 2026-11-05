// Read-only health check of a recorded deployment: chain ID, code present, Spray wired to the token, token decimals.
import { erc20Abi } from 'viem'
import { explorerAddress, fail, getNetwork, loadArtifact, makeClients, preflight, readDeployment } from './lib.mjs'

const net = getNetwork(process.argv[2] || 'bohr')
const dep = readDeployment(net.key)
const { publicClient } = makeClients(net)
await preflight(net, publicClient, dep.deployer)

const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label}${extra ? '  ' + extra : ''}`)
let bad = 0
const check = (label, cond, extra) => { ok(label, cond, extra); if (!cond) bad++ }

const [sprayCode, tokenCode] = await Promise.all([
  publicClient.getCode({ address: dep.spray }),
  publicClient.getCode({ address: dep.token }),
])
check('Spray contract has code', Boolean(sprayCode && sprayCode !== '0x'), explorerAddress(net, dep.spray))
check('Token contract has code', Boolean(tokenCode && tokenCode !== '0x'), explorerAddress(net, dep.token))
const wired = await publicClient.readContract({ address: dep.spray, abi: loadArtifact('Spray').abi, functionName: 'usdc' })
check('Spray points at the token', wired.toLowerCase() === dep.token.toLowerCase())
const decimals = await publicClient.readContract({ address: dep.token, abi: erc20Abi, functionName: 'decimals' })
const symbol = await publicClient.readContract({ address: dep.token, abi: erc20Abi, functionName: 'symbol' })
check(`Token ${symbol} has 6 decimals`, decimals === 6, `(${decimals})`)
const events = await publicClient.readContract({ address: dep.spray, abi: loadArtifact('Spray').abi, functionName: 'nextEventId' })
console.log(`\nEvents created so far: ${events}`)
if (bad) fail(`${bad} check(s) failed.`)
console.log('All checks passed.')
