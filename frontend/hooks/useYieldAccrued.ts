"use client";

import { useReadContract } from "wagmi";
import { hookABI, hookAddress, lendingPoolABI, lendingPoolAddress } from "@/lib/contracts";

export function useYieldAccrued(address: `0x${string}` | undefined) {
  const { data: yieldData, ...rest } = useReadContract({
    abi: hookABI,
    address: hookAddress(),
    functionName: "estimateYieldAccrued",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: apyData } = useReadContract({
    abi: lendingPoolABI,
    address: lendingPoolAddress(),
    functionName: "getApy",
    args: address ? [lendingPoolAddress()] : undefined,
    query: { enabled: !!address },
  });

  const arr = yieldData as [bigint, bigint] | undefined;
  const totalYield = arr ? arr[0] + arr[1] : undefined;
  const apyBps = apyData as bigint | undefined;

  return {
    data: totalYield,
    yield0: arr ? arr[0] : undefined,
    yield1: arr ? arr[1] : undefined,
    apyBps,
    formattedApy: apyBps ? `${(Number(apyBps) / 100).toFixed(2)}%` : undefined,
    ...rest,
  };
}
