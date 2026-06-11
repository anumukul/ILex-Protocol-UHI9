interface ILMeterProps {
  currentILBps: number
  thresholdBps: number
  status: number
}

export default function ILMeter({ currentILBps, thresholdBps, status }: ILMeterProps) {
  const pct = Math.min((currentILBps / thresholdBps) * 100, 100)
  const isExited = status === 3

  const barColor =
    pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">IL Meter</span>
        <span className="text-sm text-gray-500">
          {currentILBps.toFixed(1)}% / {thresholdBps.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isExited && (
        <p className="mt-2 text-xs text-blue-400">Position parked — no longer at risk</p>
      )}
    </div>
  )
}
