import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4 text-purple-500" />
            ILex Protocol — Fully on-chain IL protection
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Powered by Reactive Network</span>
            <span>Uniswap v4 Hook</span>
            <span>Unichain Sepolia</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
