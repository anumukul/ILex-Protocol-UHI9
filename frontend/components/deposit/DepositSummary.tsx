interface DepositSummaryProps {
  amount0: string
  amount1: string
  tickLower: number
  tickUpper: number
  ilThresholdBps: number
  reentryToleranceBps: number
}

export default function DepositSummary({
  amount0,
  amount1,
  tickLower,
  tickUpper,
  ilThresholdBps,
  reentryToleranceBps,
}: DepositSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/50 p-4 text-sm">
      <div className="mb-2 text-xs font-medium text-gray-500">Summary</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Amount 0</span>
          <span className="text-gray-300">{amount0 || '0'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount 1</span>
          <span className="text-gray-300">{amount1 || '0'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Range</span>
          <span className="text-gray-300">{tickLower} → {tickUpper}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">IL Threshold</span>
          <span className="text-gray-300">{(ilThresholdBps / 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Reentry Tolerance</span>
          <span className="text-gray-300">{(reentryToleranceBps / 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}
