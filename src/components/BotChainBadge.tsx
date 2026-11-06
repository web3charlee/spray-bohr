import { ExternalLink } from 'lucide-react'
import { IS_BOT_CHAIN } from '../network'

/** "Built on BOT Chain" with clickable links to the official site and block explorer. Hidden on the Arc build. */
export function BotChainBadge() {
  if (!IS_BOT_CHAIN) return null
  const link = 'inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#FFD166] transition-colors'
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#FFF6E3]/60 pt-4">
      <span className="font-semibold text-[#FFF6E3]/80">Built on BOT Chain</span>
      <a href="https://botchain.ai" target="_blank" rel="noopener noreferrer" className={link}>
        botchain.ai <ExternalLink size={11} />
      </a>
      <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" className={link}>
        scan.botchain.ai <ExternalLink size={11} />
      </a>
    </div>
  )
}
