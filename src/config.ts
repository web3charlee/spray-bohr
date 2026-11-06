/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import type { Chain } from 'viem'
import { registerChain } from './tracing'
import { NETWORK } from './network'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(NETWORK.chainId, NETWORK.rpcUrl)

// Active chain is Arc mainnet by default (gas token IS USDC — viem's 'arc' definition already
// sets nativeCurrency to USDC) or BOT Bohr testnet when VITE_NETWORK=bohr.
export const config = createConfig({
  chains: [NETWORK.chain, mainnet] as readonly [Chain, ...Chain[]],
  connectors: [injected()],
  transports: {
    [NETWORK.chainId]: http(NETWORK.rpcUrl),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
