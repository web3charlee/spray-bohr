/**
 * Shared viem public client for the active network (Arc mainnet, or BOT Bohr testnet).
 * Import this instead of constructing a new client per file.
 */
import { createPublicClient, http } from 'viem'
import { NETWORK } from '../network'

export const publicClient = createPublicClient({
  chain: NETWORK.chain,
  transport: http(NETWORK.rpcUrl),
})
