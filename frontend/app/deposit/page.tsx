'use client'
import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import ThresholdSlider from '@/components/deposit/ThresholdSlider'
import DepositSummary from '@/components/deposit/DepositSummary'
import { useDeposit } from '@/hooks/useDeposit'
import { TOKEN0_ADDRESS, TOKEN1_ADDRESS } from '@/lib/contracts'

export default function DepositPage() {
  const { address, isConnected } = useAccount()
  const { deposit, approveToken0, approveToken1, isPendingApprove0, isPendingApprove1, isPendingDeposit, isSuccess } = useDeposit()

  const [step, setStep] = useState(1)
  const [amount0, setAmount0] = useState('0.01')
  const [amount1, setAmount1] = useState('0.01')
  const [ilThresholdBps, setIlThresholdBps] = useState(500)
  const [reentryBps, setReentryBps] = useState(200)

  const amount0Wei = useMemo(() => {
    try { return BigInt(Math.floor(parseFloat(amount0 || '0') * 1e18)) }
    catch { return 0n }
  }, [amount0])

  const amount1Wei = useMemo(() => {
    try { return BigInt(Math.floor(parseFloat(amount1 || '0') * 1e18)) }
    catch { return 0n }
  }, [amount1])

  const amountsValid = parseFloat(amount0 || '0') > 0 && parseFloat(amount1 || '0') > 0

  function handleDeposit() {
    if (!address) return
    deposit({
      token0: TOKEN0_ADDRESS,
      token1: TOKEN1_ADDRESS,
      fee: 3000,
      tickSpacing: 60,
      tickLower: -60,
      tickUpper: 60,
      amount0Desired: amount0Wei,
      amount1Desired: amount1Wei,
      ilThresholdBps: BigInt(ilThresholdBps),
      reentryToleranceBps: BigInt(reentryBps),
    })
  }

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">Connect your wallet to create a position.</p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <h2 className="text-lg font-semibold text-emerald-400">Position Created!</h2>
          <p className="mt-2 text-sm text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? 'bg-purple-600 text-white'
                  : step > s
                  ? 'bg-purple-600/50 text-white'
                  : 'border border-gray-700 text-gray-500'
              }`}
            >
              {s}
            </div>
            <span className={`text-xs ${step === s ? 'text-white' : 'text-gray-600'}`}>
              {s === 1 ? 'Amounts' : s === 2 ? 'Protection' : 'Review'}
            </span>
            {s < 3 && <span className="text-gray-700">›</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Amount 0</label>
              <input
                type="text"
                value={amount0}
                onChange={(e) => setAmount0(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Amount 1</label>
              <input
                type="text"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!amountsValid}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <ThresholdSlider
              label="IL Threshold"
              value={ilThresholdBps}
              onChange={setIlThresholdBps}
              suffix="exit if exceeded"
            />
            <ThresholdSlider
              label="Reentry Tolerance"
              value={reentryBps}
              onChange={setReentryBps}
              suffix="reenter when price within this range"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <DepositSummary
              amount0={amount0}
              amount1={amount1}
              tickLower={-60}
              tickUpper={60}
              ilThresholdBps={ilThresholdBps}
              reentryToleranceBps={reentryBps}
            />

            <button
              onClick={approveToken0}
              disabled={isPendingApprove0}
              className="w-full rounded-xl border border-purple-800/50 bg-purple-950/30 px-4 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-950/50 disabled:opacity-50"
            >
              {isPendingApprove0 ? 'Approving...' : 'Approve Token 0'}
            </button>

            <button
              onClick={approveToken1}
              disabled={isPendingApprove1}
              className="w-full rounded-xl border border-purple-800/50 bg-purple-950/30 px-4 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-950/50 disabled:opacity-50"
            >
              {isPendingApprove1 ? 'Approving...' : 'Approve Token 1'}
            </button>

            <button
              onClick={handleDeposit}
              disabled={isPendingDeposit}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {isPendingDeposit ? 'Depositing...' : 'Deposit'}
            </button>

            <button
              onClick={() => setStep(2)}
              className="w-full rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
