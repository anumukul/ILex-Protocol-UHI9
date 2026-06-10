"use client";

import { useWriteContract } from "wagmi";
import { hookABI, hookAddress } from "@/lib/contracts";

export function useManualExit() {
  const { writeContract, isPending, isSuccess, error, reset } = useWriteContract();

  function manualExit() {
    writeContract({
      abi: hookABI,
      address: hookAddress(),
      functionName: "manualExit",
      args: [],
    });
  }

  return { manualExit, isPending, isSuccess, error, reset };
}
