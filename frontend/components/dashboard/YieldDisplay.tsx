interface YieldDisplayProps {
  yield0: bigint
  yield1: bigint
  apyBps: number
  status: number
}

function formatYield(val: bigint): string {
  const n = Number(val) / 1e18
  if (n < 0.0001) return '< 0.0001'
  return n.toFixed(4)
}

export default function YieldDisplay({ yield0, yield1, apyBps, status }: YieldDisplayProps) {
  const isParked = status === 3

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Yield Accrued</span>
        <span className="text-xs text-emerald-400">{apyBps / 100}% APY</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Token 0</span>
          <span className="font-mono text-gray-300">{formatYield(yield0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Token 1</span>
          <span className="font-mono text-gray-300">{formatYield(yield1)}</span>
        </div>
      </div>

      {!isParked && (
        <p className="mt-3 text-xs text-gray-600">
          Yield accumulates while position is parked
        </p>
      )}
    </div>
  )
}
