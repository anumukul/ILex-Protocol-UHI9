"use client";

import { useAccount, useReadContract } from "wagmi";
import { ILEX_HOOK_ABI, ILEX_HOOK_ADDRESS, POOL_MANAGER_ABI, POOL_MANAGER_ADDRESS } from "@/lib/contracts";

export function usePosition() {
  const { address } = useAccount();

  const { data: raw, refetch, ...rest } = useReadContract({
    abi: ILEX_HOOK_ABI,
    address: ILEX_HOOK_ADDRESS,
    functionName: "positions",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: il } = useReadContract({
    abi: ILEX_HOOK_ABI,
    address: ILEX_HOOK_ADDRESS,
    functionName: "getCurrentIL",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const position = raw as {
    poolKey: {
      currency0: `0x${string}`;
      currency1: `0x${string}`;
      fee: number;
      tickSpacing: number;
      hooks: `0x${string}`;
    };
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
    entrySqrtPriceX96: bigint;
    ilThresholdBps: bigint;
    reentryToleranceBps: bigint;
    status: number;
    depositTimestamp: bigint;
  } | undefined;

  const { data: slot0 } = useReadContract({
    abi: POOL_MANAGER_ABI,
    address: POOL_MANAGER_ADDRESS,
    functionName: "slot0",
    args: position?.poolKey ? [position.poolKey] : undefined,
    query: { enabled: !!position?.poolKey, refetchInterval: 15_000 },
  });

  return {
    position,
    currentIL: il as bigint | undefined,
    currentSqrtPriceX96: slot0 ? slot0[0] : undefined,
    refetch,
  };
}
