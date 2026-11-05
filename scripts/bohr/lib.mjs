// Shared helpers for the Bohr / BOT Chain scripts. Plain Node + viem: no Foundry needed.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, defineChain, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const BUILD_DIR = path.join(ROOT, 'contracts', 'build')
export const DEPLOY_DIR = path.join(ROOT, 'deployments')

// Network facts come from BOT Chain (their BD team + integration guide). Verify against the official docs.
export const NETWORKS = {
  bohr: {
    key: 'bohr',
    name: 'BOT Bohr Testnet',
    chainId: 968,
    rpc: 'https://rpc.bohr.life',
    explorer: 'https://scan.bohr.life',
    testnet: true,
    gasFaucet: 'https://faucet.botchain.ai/basic',
  },
  botmainnet: {
    key: 'botmainnet',
    name: 'BOT Chain Mainnet',
    chainId: 677,
    rpc: 'https://rpc.botchain.ai',
    explorer: 'https://scan.botchain.ai',
    testnet: false,
    // USDT on BOT Chain, as listed in BOT's integration guide. The deploy script refuses to continue unless it has 6 decimals.
    token: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  },
}

export function fail(msg) {
  console.error('\nERROR: ' + msg + '\n')
  process.exit(1)
}

export function getNetwork(key) {
  const net = NETWORKS[key]
  if (!net) fail(`Unknown network "${key}". Use one of: ${Object.keys(NETWORKS).join(', ')}`)
  // RPC_URL is only meant for testing against a local chain. The chain ID check still applies.
  return { ...net, rpc: process.env.RPC_URL || net.rpc }
}

export function loadAccount() {
  const key = (process.env.DEPLOYER_KEY || '').trim()
  if (!key) {
    fail(
      'DEPLOYER_KEY is not set.\n' +
        'Set it for this terminal session only (never put it in a file):\n' +
        '  PowerShell:  $env:DEPLOYER_KEY = "0xYOUR_TESTNET_PRIVATE_KEY"\n' +
        '  Mac/Linux:   export DEPLOYER_KEY=0xYOUR_TESTNET_PRIVATE_KEY\n' +
        'No wallet yet? Run:  npm run wallet:new',
    )
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) fail('DEPLOYER_KEY must be 0x followed by 64 hex characters.')
  return privateKeyToAccount(key)
}

export function makeClients(net, account) {
  const chain = defineChain({
    id: net.chainId,
    name: net.name,
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: { default: { http: [net.rpc] } },
    blockExplorers: { default: { name: 'Scan', url: net.explorer } },
  })
  const transport = http(net.rpc)
  return {
    chain,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: account ? createWalletClient({ account, chain, transport }) : undefined,
  }
}

export async function preflight(net, publicClient, address) {
  let id
  try {
    id = await publicClient.getChainId()
  } catch (e) {
    fail(`Cannot reach ${net.rpc}. Check your internet connection or ask BOT Chain about the RPC.\n(${e.shortMessage || e.message})`)
  }
  if (id !== net.chainId) fail(`The RPC reports chain ID ${id}, but ${net.name} should be ${net.chainId}. Stopping so nothing is sent to the wrong chain.`)
  return publicClient.getBalance({ address })
}

export function explorerTx(net, hash) {
  return `${net.explorer}/tx/${hash}`
}
export function explorerAddress(net, address) {
  return `${net.explorer}/address/${address}`
}

export function loadArtifact(name) {
  const file = path.join(BUILD_DIR, `${name}.json`)
  if (!fs.existsSync(file)) fail(`${file} not found. Run: npm run compile`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function readDeployment(netKey) {
  const file = path.join(DEPLOY_DIR, `${netKey}.json`)
  if (!fs.existsSync(file)) fail(`No deployment record for "${netKey}" (${file}). Run the deploy script first.`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function writeDeployment(netKey, data) {
  fs.mkdirSync(DEPLOY_DIR, { recursive: true })
  fs.writeFileSync(path.join(DEPLOY_DIR, `${netKey}.json`), JSON.stringify(data, null, 2) + '\n')
}

// Update only the given keys in .env (public addresses only), keeping any other lines.
export function writeEnv(values) {
  const file = path.join(ROOT, '.env')
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : []
  for (const [k, v] of Object.entries(values)) {
    const i = lines.findIndex(l => l.startsWith(k + '='))
    if (i >= 0) lines[i] = `${k}=${v}`
    else lines.push(`${k}=${v}`)
  }
  fs.writeFileSync(file, lines.filter((l, i, a) => l !== '' || i < a.length - 1).join('\n').replace(/\n*$/, '\n'))
  return file
}

export async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return answer.trim()
}

export const sleep = ms => new Promise(r => setTimeout(r, ms))
