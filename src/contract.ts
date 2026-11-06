import artifact from '../contracts/out/Spray.sol/Spray.json'
import { NETWORK } from './network'

// Addresses/chain come from ./network (Arc mainnet by default, BOT Bohr testnet when VITE_NETWORK=bohr).
export const SPRAY_ADDRESS = NETWORK.sprayAddress
// Block at which the Spray contract was deployed — getLogs start point.
export const SPRAY_DEPLOY_BLOCK = NETWORK.deployBlock
// If a chunk call fails the hook reduces chunk size automatically and retries.
export const LOG_CHUNK_SIZE = NETWORK.logChunkSize

export const SPRAY_ABI = artifact.abi

export const SPRAY_CONTRACT = {
  address: SPRAY_ADDRESS,
  abi: SPRAY_ABI,
} as const

// Active chain + payment token (USDC on Arc, tUSDC test token on Bohr). Both are 6 decimals.
export const CHAIN_ID = NETWORK.chainId
export const USDC_ADDRESS = NETWORK.tokenAddress
export const USDC_DECIMALS = 6

export const MIN_SPRAY = 0.10 // USDC
export const MAX_SPRAY = 20.0 // USDC
export const EVENT_CAP = 200.0 // USDC

export enum SprayMode {
  LIVE = 0,
  POT = 1,
}

export enum EventStatus {
  OPEN = 0,
  CLOSED = 1,
  CANCELLED = 2,
  SETTLED = 3,
}

export interface SprayEvent {
  name: string
  host: string
  recipients: string[]
  sharesBps: number[]
  mode: SprayMode
  status: EventStatus
  unlockAt: bigint
  ngnPerUsd: bigint
  totalSprayed: bigint
}
