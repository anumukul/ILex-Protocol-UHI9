'use client'
import StatusBadge from './StatusBadge'

interface Position {
  poolKey: { currency0: string; currency1: string }
  tickLower: number
  tickUpper: number
  liquidity: bigint
  ilThresholdBps: bigint
  reentryToleranceBps: bigint
  status: number
  depositTimestamp: bigint
}

interface PositionCardProps {
  position: Position
  currentILBps: bigint | undefined | null
  onManualExit: () => void
  isExiting: boolean
}

export default function PositionCard({ position, currentILBps, onManualExit, isExiting }: PositionCardProps) {
  const isParked = position.status === 3

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Position</h3>
        <StatusBadge status={position.status} />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Pair</span>
          <span className="font-mono text-gray-300">
            {position.poolKey.currency0.slice(0, 6)}...{position.poolKey.currency0.slice(-4)} /{' '}
            {position.poolKey.currency1.slice(0, 6)}...{position.poolKey.currency1.slice(-4)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Range</span>
          <span className="text-gray-300">
            {position.tickLower} → {position.tickUpper}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">IL Threshold</span>
          <span className="text-gray-300">{Number(position.ilThresholdBps) / 100}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Reentry Tolerance</span>
          <span className="text-gray-300">{Number(position.reentryToleranceBps) / 100}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Current IL</span>
            <span className={currentILBps != null && Number(currentILBps) > Number(position.ilThresholdBps)
            ? 'font-medium text-red-400'
            : 'text-gray-300'
          }>
            {currentILBps != null ? `${(Number(currentILBps) / 100).toFixed(2)}%` : '—'}
          </span>
        </div>
      </div>

      {!isParked && (
        <button
          onClick={onManualExit}
          disabled={isExiting}
          className="mt-6 w-full rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/50 disabled:opacity-50"
        >
          {isExiting ? 'Exiting...' : 'Manual Exit'}
        </button>
      )}
    </div>
  )
}
