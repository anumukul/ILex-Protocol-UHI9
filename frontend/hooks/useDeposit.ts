'use client'
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { ILEX_HOOK_ABI, ILEX_HOOK_ADDRESS, TOKEN0_ADDRESS, TOKEN1_ADDRESS, erc20ABI } from '@/lib/contracts'
import { maxUint256 } from 'viem'

interface DepositParams {
  token0: `0x${string}`
  token1: `0x${string}`
  fee: number
  tickSpacing: number
  tickLower: number
  tickUpper: number
  amount0Desired: bigint
  amount1Desired: bigint
  ilThresholdBps: bigint
  reentryToleranceBps: bigint
}

export function useDeposit() {
  const { writeContract: writeApprove0, data: approveTx0, isPending: isPendingApprove0 } = useWriteContract()
  const { writeContract: writeApprove1, data: approveTx1, isPending: isPendingApprove1 } = useWriteContract()
  const { writeContract: writeDeposit, data: depositTx, isPending: isPendingDeposit } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: depositTx })

  const { data: isApproved0 } = useReadContract({
    address: TOKEN0_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [ILEX_HOOK_ADDRESS, ILEX_HOOK_ADDRESS],
    query: { refetchInterval: 15_000 },
  })

  const { data: isApproved1 } = useReadContract({
    address: TOKEN1_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [ILEX_HOOK_ADDRESS, ILEX_HOOK_ADDRESS],
    query: { refetchInterval: 15_000 },
  })

  const approveToken0 = () => {
    writeApprove0({
      address: TOKEN0_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [ILEX_HOOK_ADDRESS, maxUint256],
    })
  }

  const approveToken1 = () => {
    writeApprove1({
      address: TOKEN1_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [ILEX_HOOK_ADDRESS, maxUint256],
    })
  }

  const deposit = (params: DepositParams) => {
    writeDeposit({
      address: ILEX_HOOK_ADDRESS,
      abi: ILEX_HOOK_ABI,
      functionName: 'deposit',
      args: [
        {
          currency0: params.token0,
          currency1: params.token1,
          fee: params.fee,
          tickSpacing: params.tickSpacing,
          hooks: ILEX_HOOK_ADDRESS,
        },
        params.tickLower,
        params.tickUpper,
        params.amount0Desired,
        params.amount1Desired,
        params.ilThresholdBps,
        params.reentryToleranceBps,
      ],
    })
  }

  return {
    approveToken0,
    approveToken1,
    deposit,
    isPendingApprove0,
    isPendingApprove1,
    isPendingDeposit,
    isSuccess,
  }
}
