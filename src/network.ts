/**
 * Network selection for Spray.
 *
 * This is the standalone BOT Chain edition of Spray. VITE_NETWORK picks the network:
 *   bohr (default)  BOT Bohr testnet with a worthless test token (tUSDC)
 *   botmainnet      BOT Chain mainnet with real USDT (real money)
 *  The Arc mainnet code path is kept only so this
 * folder can be diffed against the original; set VITE_NETWORK=arc to use it (don't).
 *
 * Contract addresses come from env vars that the deploy script writes into .env,
 * so nothing here needs editing after deployment.
 */
import { defineChain, type Chain } from 'viem'
import { arc } from 'viem/chains'

export type NetworkKey = 'arc' | 'bohr' | 'botmainnet'

/** BOT Bohr testnet — values supplied by the BOT Chain team (chain ID 968). */
export const bohrTestnet = defineChain({
  id: 968,
  name: 'BOT Bohr Testnet',
  // Gas token is "test BOT" per the faucet. Symbol/decimals are the standard EVM assumption —
  // confirm against https://dev-docs.botchain.ai/docs/Developers/quick-guide/
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
  blockExplorers: { default: { name: 'Bohr Scan', url: 'https://scan.bohr.life' } },
  testnet: true,
})

/** BOT Chain mainnet — chain ID, RPC and explorer from BOT's integration guide (verify at https://dev-docs.botchain.ai). */
export const botMainnet = defineChain({
  id: 677,
  name: 'BOT Chain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.botchain.ai'] } },
  blockExplorers: { default: { name: 'BOT Scan', url: 'https://scan.botchain.ai' } },
})

/** USDT on BOT Chain mainnet, as listed in BOT's guide. Spray assumes 6 decimals — scripts/bohr/deploy.mjs refuses to deploy otherwise. */
const BOT_MAINNET_USDT = '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C' as const

export interface NetworkConfig {
  key: NetworkKey
  chain: Chain
  chainId: number
  /** Short name used in "Switch to …" buttons and footers. */
  shortName: string
  rpcUrl: string
  explorerBase: string
  sprayAddress: `0x${string}`
  /** Block the Spray contract was deployed at — getLogs start point. */
  deployBlock: bigint
  logChunkSize: bigint
  tokenAddress: `0x${string}`
  tokenSymbol: string
  isTestnet: boolean
  /** Where to get gas on a testnet. */
  gasFaucetUrl?: string
  /** True when the token has a public claim() faucet (TestUSDC). */
  hasTokenClaim: boolean
  /** Where users can get the payment token on mainnet. */
  bridgeUrl?: string
  dexUrl?: string
}

function requireEnv(name: string): string {
  const v = import.meta.env[name] as string | undefined
  if (!v) {
    throw new Error(
      `Missing ${name}. Run npm run deploy:bohr first (it writes these into .env), or set them in your host's environment variables.`,
    )
  }
  return v
}

function buildArc(): NetworkConfig {
  return {
    key: 'arc',
    chain: arc,
    chainId: 5042,
    shortName: 'Arc',
    rpcUrl: 'https://rpc.mainnet.arc.io',
    explorerBase: 'https://explorer.arc.io',
    sprayAddress: '0xbba7805fc33ce405274227776e712bdbd555401c',
    deployBlock: 27_024_769n,
    // Arc mainnet RPC — probe showed 2 000 blocks per getLogs call is safe.
    logChunkSize: 2_000n,
    tokenAddress: '0x3600000000000000000000000000000000000000',
    tokenSymbol: 'USDC',
    isTestnet: false,
    hasTokenClaim: false,
  }
}

function buildBotMainnet(): NetworkConfig {
  return {
    key: 'botmainnet',
    chain: botMainnet,
    chainId: botMainnet.id,
    shortName: 'BOT Chain',
    rpcUrl: 'https://rpc.botchain.ai',
    explorerBase: 'https://scan.botchain.ai',
    sprayAddress: requireEnv('VITE_SPRAY_ADDRESS') as `0x${string}`,
    deployBlock: BigInt(requireEnv('VITE_SPRAY_DEPLOY_BLOCK')),
    logChunkSize: 1_000n,
    tokenAddress: BOT_MAINNET_USDT,
    tokenSymbol: 'USDT',
    isTestnet: false,
    hasTokenClaim: false,
    bridgeUrl: 'https://bridge.botchain.ai',
    dexUrl: 'https://dex.botchain.ai/#/swap',
  }
}

function buildBohr(): NetworkConfig {
  return {
    key: 'bohr',
    chain: bohrTestnet,
    chainId: bohrTestnet.id,
    shortName: 'BOT Bohr Testnet',
    rpcUrl: 'https://rpc.bohr.life',
    explorerBase: 'https://scan.bohr.life',
    sprayAddress: requireEnv('VITE_SPRAY_ADDRESS') as `0x${string}`,
    deployBlock: BigInt(requireEnv('VITE_SPRAY_DEPLOY_BLOCK')),
    // Unknown RPC limit — the logs hook halves this automatically if a call fails.
    logChunkSize: 1_000n,
    tokenAddress: requireEnv('VITE_TOKEN_ADDRESS') as `0x${string}`,
    tokenSymbol: 'tUSDC',
    isTestnet: true,
    gasFaucetUrl: 'https://faucet.botchain.ai/basic',
    hasTokenClaim: true,
  }
}

const requested = (import.meta.env.VITE_NETWORK as string | undefined) ?? 'bohr'

export const NETWORK: NetworkConfig =
  requested === 'arc' ? buildArc() : requested === 'botmainnet' ? buildBotMainnet() : buildBohr()

/** True for both BOT Chain builds (testnet and mainnet). */
export const IS_BOT_CHAIN = NETWORK.key !== 'arc'

export function explorerTxUrl(hash: string): string {
  return `${NETWORK.explorerBase}/tx/${hash}`
}

export function explorerAddressUrl(address: string): string {
  return `${NETWORK.explorerBase}/address/${address}`
}

/** Minimal ABI for the TestUSDC faucet. */
export const TEST_TOKEN_CLAIM_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const
