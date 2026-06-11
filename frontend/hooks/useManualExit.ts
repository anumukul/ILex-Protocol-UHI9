'use client'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ILEX_HOOK_ABI, ILEX_HOOK_ADDRESS } from '@/lib/contracts'

export function useManualExit() {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const manualExit = () => {
    writeContract({
      address: ILEX_HOOK_ADDRESS,
      abi: ILEX_HOOK_ABI,
      functionName: 'manualExit',
    })
  }

  return { manualExit, isPending: isPending || isConfirming, isSuccess }
}
