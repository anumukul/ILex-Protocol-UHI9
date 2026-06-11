'use client'
import { useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { ILEX_HOOK_ABI, ILEX_HOOK_ADDRESS, MOCK_LENDING_POOL_ABI, MOCK_LENDING_POOL_ADDRESS } from '@/lib/contracts'

export function useYieldAccrued() {
  const { address } = useAccount()

  const { data: yieldData } = useReadContract({
    address: ILEX_HOOK_ADDRESS,
    abi: ILEX_HOOK_ABI,
    functionName: 'estimateYieldAccrued',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 30_000 },
  })

  const { data: apyBpsData } = useReadContract({
    address: MOCK_LENDING_POOL_ADDRESS,
    abi: MOCK_LENDING_POOL_ABI,
    functionName: 'getApy',
  })

  const arr = yieldData as [bigint, bigint] | undefined

  return {
    yield0: arr?.[0] ?? 0n,
    yield1: arr?.[1] ?? 0n,
    apyBps: Number(apyBpsData ?? 300n),
  }
}
