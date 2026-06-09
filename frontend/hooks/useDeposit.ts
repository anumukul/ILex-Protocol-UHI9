"use client";

import { useCallback } from "react";
import { useWriteContract } from "wagmi";
import { hookABI, hookAddress, poolManagerAddress } from "@/lib/contracts";

interface DepositParams {
  token0: `0x${string}`;
  token1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  ilThresholdBps: bigint;
  reentryToleranceBps: bigint;
}

export function useDeposit() {
  const { writeContract, isPending, data, ...rest } = useWriteContract();

  const deposit = useCallback(
    (params: DepositParams) => {
      writeContract({
        abi: hookABI,
        address: hookAddress(),
        functionName: "deposit",
        args: [
          {
            currency0: params.token0,
            currency1: params.token1,
            fee: params.fee,
            tickSpacing: params.tickSpacing,
            hooks: hookAddress(),
          },
          params.tickLower,
          params.tickUpper,
          params.amount0Desired,
          params.amount1Desired,
          params.ilThresholdBps,
          params.reentryToleranceBps,
        ],
      });
    },
    [writeContract],
  );

  return { deposit, isPending, hash: data, ...rest };
}

export function useManualExit() {
  const { writeContract, isPending, data, ...rest } = useWriteContract();

  const exit = useCallback(() => {
    writeContract({
      abi: hookABI,
      address: hookAddress(),
      functionName: "manualExit",
    });
  }, [writeContract]);

  return { exit, isPending, hash: data, ...rest };
}
