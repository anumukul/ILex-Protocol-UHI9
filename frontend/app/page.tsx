import Link from 'next/link'
import { Zap } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '💰',
    title: 'Deposit & Configure',
    description: 'Add your tokens and set your maximum IL tolerance. Takes 2 minutes.',
  },
  {
    step: '02',
    icon: '👁️',
    title: 'Reactive Network Monitors',
    description: 'Our on-chain RSC watches every swap on your pool 24/7. No bots, no off-chain code.',
  },
  {
    step: '03',
    icon: '🚨',
    title: 'Auto-Exit on IL Breach',
    description: 'When IL hits your limit, position exits automatically. Funds move to lending pool.',
  },
  {
    step: '04',
    icon: '✅',
    title: 'Auto-Reenter on Recovery',
    description: 'When price recovers, RSC re-adds your liquidity — with yield earned while parked.',
  },
]

const STATS = [
  { value: '100%', label: 'On-Chain' },
  { value: '0', label: 'Bots / Keepers' },
  { value: '24/7', label: 'Monitoring' },
  { value: 'Trustless', label: 'Automation' },
]

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-800 bg-purple-950/60 px-4 py-2 text-sm text-purple-300">
          <Zap className="h-4 w-4" /> Powered by Reactive Network
        </div>
        <h1 className="mb-6 text-5xl font-black leading-tight text-white md:text-7xl">
          Your LP position.
          <br />
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Protected automatically.
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-400">
          ILex monitors your Uniswap v4 position 24/7 via Reactive Network.
          When IL hits your limit, we exit and earn yield. When price recovers, we re-enter.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/deposit"
            className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-purple-700"
          >
            Protect My Position →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-700 px-8 py-4 text-lg font-bold text-white transition-colors hover:border-gray-600"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">How ILex Works</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-700"
            >
              <div className="mb-4 text-3xl">{item.icon}</div>
              <div className="mb-2 font-mono text-xs text-purple-500">{item.step}</div>
              <h3 className="mb-2 font-bold text-white">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reactive Network callout */}
      <section className="py-12">
        <div className="rounded-2xl border border-purple-800/50 bg-gradient-to-r from-purple-950/50 to-cyan-950/50 p-8 text-center">
          <h3 className="mb-3 text-xl font-bold text-white">
            Fully On-Chain. No Bots. No Centralized Keepers.
          </h3>
          <p className="mx-auto max-w-xl text-gray-400">
            ILex uses Reactive Smart Contracts — RSCs deployed on Reactive Network that
            subscribe to pool events and fire callbacks automatically. Trustless automation,
            on-chain guarantees.
          </p>
        </div>
      </section>
    </div>
  )
}
