"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { erc20ABI, hookAddress } from "@/lib/contracts";

export function useTokenBalance(
  token: `0x${string}` | undefined,
  account: `0x${string}` | undefined,
) {
  return useReadContract({
    abi: erc20ABI,
    address: token,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!token && !!account, refetchInterval: 15_000 },
  });
}

export function useTokenAllowance(
  token: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
) {
  return useReadContract({
    abi: erc20ABI,
    address: token,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!token && !!owner && !!spender, refetchInterval: 15_000 },
  });
}

export function useTokenApprove() {
  const { writeContract, isPending, data, ...rest } = useWriteContract();

  const approve = (token: `0x${string}`, amount: bigint) => {
    writeContract({
      abi: erc20ABI,
      address: token,
      functionName: "approve",
      args: [hookAddress(), amount],
    });
  };

  return { approve, isPending, hash: data, ...rest };
}

export function useTokenMint() {
  const { writeContract, isPending, data, ...rest } = useWriteContract();

  const mint = (token: `0x${string}`, to: `0x${string}`, amount: bigint) => {
    writeContract({
      abi: erc20ABI,
      address: token,
      functionName: "mint",
      args: [to, amount],
    });
  };

  return { mint, isPending, hash: data, ...rest };
}
