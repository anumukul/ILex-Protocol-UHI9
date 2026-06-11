'use client'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { usePosition } from '@/hooks/usePosition'
import { useManualExit } from '@/hooks/useManualExit'
import { useYieldAccrued } from '@/hooks/useYieldAccrued'
import PositionCard from '@/components/dashboard/PositionCard'
import ILMeter from '@/components/dashboard/ILMeter'
import YieldDisplay from '@/components/dashboard/YieldDisplay'
import ActivityFeed from '@/components/dashboard/ActivityFeed'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { position, currentIL, refetch } = usePosition()
  const { manualExit, isPending: isExiting } = useManualExit()
  const { yield0, yield1, apyBps } = useYieldAccrued()

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">Connect your wallet to view your dashboard</p>
      </div>
    )
  }

  if (!position || position.status === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mb-4 text-5xl">🛡️</div>
        <h2 className="mb-3 text-2xl font-bold text-white">No Active Position</h2>
        <p className="mb-6 text-gray-400">Deposit to start protecting your LP position.</p>
        <Link
          href="/deposit"
          className="rounded-xl bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          Protect My Position →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <PositionCard
          position={position}
          currentILBps={currentIL}
          onManualExit={manualExit}
          isExiting={isExiting}
        />

        <div className="space-y-6">
          <ILMeter
            currentILBps={Number(currentIL ?? 0n)}
            thresholdBps={Number(position.ilThresholdBps)}
            status={position.status}
          />
          <YieldDisplay
            yield0={yield0}
            yield1={yield1}
            apyBps={apyBps}
            status={position.status}
          />
        </div>
      </div>

      <ActivityFeed lpAddress={address} limit={8} />
    </div>
  )
}
