import { X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'
import { NETWORK, TEST_TOKEN_CLAIM_ABI, explorerTxUrl } from '../network'
import { parseOnchainError } from '../utils/onchainError'

interface UsdcNeedSheetProps {
  open: boolean
  onClose: () => void
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
  )
}

/** Testnet version: how to get gas + claim free tUSDC in one tap. */
function TestTokenBody({ onClose }: { onClose: () => void }) {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [claimHash, setClaimHash] = useState<`0x${string}` | undefined>()
  const [claiming, setClaiming] = useState(false)
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: claimHash })

  const wrongChain = isConnected && chainId !== NETWORK.chainId

  async function claim() {
    setClaiming(true)
    try {
      const hash = await writeContractAsync({
        address: NETWORK.tokenAddress,
        abi: TEST_TOKEN_CLAIM_ABI,
        functionName: 'claim',
        chainId: NETWORK.chainId,
      })
      setClaimHash(hash)
      toast.success('Claim sent — 100 test tUSDC on the way.')
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e)
      toast.error(msg.includes('ClaimTooSoon') ? 'Already claimed — you can claim again in an hour.' : parseOnchainError(e))
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="space-y-4 text-[#FFF6E3]/80 text-sm leading-relaxed">
      <p>
        This is the <strong className="text-[#FFD166]">{NETWORK.shortName}</strong> demo. It uses a free,
        worthless test token (<strong className="text-[#FFD166]">{NETWORK.tokenSymbol}</strong>) — no real money.
      </p>
      <div className="bg-[#06261C] rounded-2xl p-4 space-y-3">
        <p className="font-semibold text-[#FFF6E3]">Get set up in 3 steps:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Connect your wallet and switch to {NETWORK.shortName} — we'll prompt you.</li>
          <li>Grab a little test BOT for gas from the faucet below.</li>
          <li>Tap “Claim 100 {NETWORK.tokenSymbol}” (once per hour).</li>
        </ol>
      </div>

      {wrongChain && (
        <button
          onClick={() => switchChain({ chainId: NETWORK.chainId })}
          disabled={isSwitching}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#FFD166] to-[#F5A623] text-[#1A1405] font-semibold disabled:opacity-50"
        >
          {isSwitching ? 'Switching...' : `Switch to ${NETWORK.shortName}`}
        </button>
      )}

      <button
        onClick={claim}
        disabled={!isConnected || wrongChain || claiming || confirming}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#FFD166] to-[#F5A623] text-[#1A1405] font-semibold disabled:opacity-40 transition-all active:scale-95"
      >
        {!isConnected
          ? 'Connect a wallet first'
          : claiming || confirming
            ? 'Claiming...'
            : `Claim 100 ${NETWORK.tokenSymbol}`}
      </button>

      {confirmed && claimHash && (
        <p className="text-[#7CF2C2] text-xs text-center">
          Done! {NETWORK.tokenSymbol} is in your wallet.{' '}
          <a href={explorerTxUrl(claimHash)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        </p>
      )}

      {NETWORK.gasFaucetUrl && (
        <a
          href={NETWORK.gasFaucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#1C6B52] hover:bg-[#246057] text-[#FFF6E3] font-semibold transition-colors"
          onClick={onClose}
        >
          Get test BOT (gas)
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  )
}

/** BOT Chain mainnet: where to get USDT. Real money. */
function BotMainnetBody() {
  const btn = 'flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#1C6B52] hover:bg-[#246057] text-[#FFF6E3] font-semibold transition-colors'
  return (
    <div className="space-y-4 text-[#FFF6E3]/80 text-sm leading-relaxed">
      <p>
        To spray you need <strong className="text-[#FFD166]">{NETWORK.tokenSymbol} on {NETWORK.shortName}</strong>, plus a
        little BOT for gas.
      </p>
      <div className="bg-[#06261C] rounded-2xl p-4 space-y-3">
        <p className="font-semibold text-[#FFF6E3]">How to get set up:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Connect your wallet and switch to {NETWORK.shortName} — we'll prompt you.</li>
          <li>Bridge or swap into {NETWORK.tokenSymbol} using the official links below.</li>
          <li>Keep a little BOT in your wallet for gas.</li>
        </ol>
      </div>
      <p className="text-[#FFF6E3]/60 text-xs">
        This uses real {NETWORK.tokenSymbol}. Transactions are irreversible, so only spray what you are comfortable with.
      </p>
      {NETWORK.bridgeUrl && (
        <a href={NETWORK.bridgeUrl} target="_blank" rel="noopener noreferrer" className={btn}>
          BOT Chain Bridge <ExternalLink size={16} />
        </a>
      )}
      {NETWORK.dexUrl && (
        <a href={NETWORK.dexUrl} target="_blank" rel="noopener noreferrer" className={btn}>
          BOT Chain DEX <ExternalLink size={16} />
        </a>
      )}
    </div>
  )
}

/** Original Arc mainnet copy — unchanged. */
function ArcBody() {
  return (
    <>
      <div className="space-y-4 text-[#FFF6E3]/80 text-sm leading-relaxed">
        <p>
          To spray, you need <strong className="text-[#FFD166]">USDC on Arc</strong> — a
          fast network where gas is also paid in USDC. No ETH needed.
        </p>
        <div className="bg-[#06261C] rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-[#FFF6E3]">How to get USDC on Arc:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Connect your wallet (MetaMask or any browser wallet).</li>
            <li>Switch to Arc — we'll prompt you automatically.</li>
            <li>
              Bridge USDC from another chain, or buy directly on Arc.
              See the Arc docs for options.
            </li>
          </ol>
        </div>
        <p className="text-[#FFF6E3]/60 text-xs">
          Arc uses real USDC. Make sure you are comfortable with the
          amount before you spray — transactions are irreversible.
        </p>
      </div>

      <a
        href="https://docs.arc.io"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-[#1C6B52] hover:bg-[#246057] text-[#FFF6E3] font-semibold transition-colors"
      >
        Arc Docs
        <ExternalLink size={16} />
      </a>
    </>
  )
}

export function UsdcNeedSheet({ open, onClose }: UsdcNeedSheetProps) {
  const isTest = NETWORK.hasTokenClaim

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClose={onClose} />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F4A38] border border-[#1C6B52] rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
          >
            <div className="w-12 h-1 bg-[#1C6B52] rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-[#FFF6E3]">
                {isTest || NETWORK.key === 'botmainnet' ? `Need ${NETWORK.tokenSymbol}?` : 'Need USDC on Arc?'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[#1C6B52] transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-[#FFF6E3]/60" />
              </button>
            </div>

            {isTest ? <TestTokenBody onClose={onClose} /> : NETWORK.key === 'botmainnet' ? <BotMainnetBody /> : <ArcBody />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
