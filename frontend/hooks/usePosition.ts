"use client";

import { useReadContract } from "wagmi";
import { hookABI, hookAddress, PositionStatus } from "@/lib/contracts";

interface RawPosition {
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
}

export function usePosition(address: `0x${string}` | undefined) {
  const { data: raw, ...rest } = useReadContract({
    abi: hookABI,
    address: hookAddress(),
    functionName: "positions",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: il, ...ilRest } = useReadContract({
    abi: hookABI,
    address: hookAddress(),
    functionName: "getCurrentIL",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: parkedArr, ...parkedRest } = useReadContract({
    abi: hookABI,
    address: hookAddress(),
    functionName: "getParkedFunds",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: yield_, ...yieldRest } = useReadContract({
    abi: hookABI,
    address: hookAddress(),
    functionName: "estimateYieldAccrued",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const position: RawPosition | undefined = raw as RawPosition | undefined;

  const parkedFunds = parkedArr
    ? {
        token0Deposited: (parkedArr as unknown as [bigint, bigint, bigint])[0],
        token1Deposited: (parkedArr as unknown as [bigint, bigint, bigint])[1],
        depositTimestamp: (parkedArr as unknown as [bigint, bigint, bigint])[2],
      }
    : undefined;

  return {
    position,
    currentIL: il as bigint | undefined,
    parkedFunds,
    yieldAccrued: yield_ as bigint | undefined,
    isLoading: rest.isLoading || ilRest.isLoading || parkedRest.isLoading || yieldRest.isLoading,
  };
}
