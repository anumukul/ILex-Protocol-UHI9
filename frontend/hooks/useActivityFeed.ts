"use client";

import { useState, useEffect, useRef } from "react";
import { usePublicClient } from "wagmi";
import { hookAddress } from "@/lib/contracts";

export interface ActivityEvent {
  _eventName: string;
  address: `0x${string}`;
  blockTimestamp: bigint;
  [key: string]: unknown;
}

const CHUNK_SIZE = 10000n;
const HISTORY_BLOCKS = 100000n;
const POLL_MS = 30_000;

const createdEvent = {
  type: "event" as const,
  name: "PositionCreated" as const,
  inputs: [
    { type: "address" as const, name: "lp", indexed: true },
    { type: "uint160" as const, name: "entrySqrtPriceX96", indexed: false },
    { type: "uint256" as const, name: "ilThresholdBps", indexed: false },
    { type: "uint256" as const, name: "reentryToleranceBps", indexed: false },
    { type: "int24" as const, name: "tickLower", indexed: false },
    { type: "int24" as const, name: "tickUpper", indexed: false },
    { type: "uint256" as const, name: "token0Amount", indexed: false },
    { type: "uint256" as const, name: "token1Amount", indexed: false },
  ],
};

const exitedEvent = {
  type: "event" as const,
  name: "PositionExited" as const,
  inputs: [
    { type: "address" as const, name: "lp", indexed: true },
    { type: "uint160" as const, name: "exitSqrtPriceX96", indexed: false },
    { type: "uint256" as const, name: "ilAtExitBps", indexed: false },
    { type: "uint256" as const, name: "token0Parked", indexed: false },
    { type: "uint256" as const, name: "token1Parked", indexed: false },
    { type: "uint256" as const, name: "timestamp", indexed: false },
  ],
};

const reenteredEvent = {
  type: "event" as const,
  name: "PositionReentered" as const,
  inputs: [
    { type: "address" as const, name: "lp", indexed: true },
    { type: "uint160" as const, name: "reentryPriceX96", indexed: false },
    { type: "uint256" as const, name: "yieldEarned0", indexed: false },
    { type: "uint256" as const, name: "yieldEarned1", indexed: false },
    { type: "uint256" as const, name: "timestamp", indexed: false },
  ],
};

const manualExitEvent = {
  type: "event" as const,
  name: "ManualExit" as const,
  inputs: [
    { type: "address" as const, name: "lp", indexed: true },
    { type: "uint256" as const, name: "token0Returned", indexed: false },
    { type: "uint256" as const, name: "token1Returned", indexed: false },
    { type: "uint8" as const, name: "statusAtExit", indexed: false },
  ],
};

async function fetchLogs(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  event: any,
  address: `0x${string}` | undefined,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<any[]> {
  const all: any[] = [];
  let f = fromBlock;
  while (f <= toBlock) {
    const t = f + CHUNK_SIZE - 1n > toBlock ? toBlock : f + CHUNK_SIZE - 1n;
    const chunk = await client.getLogs({
      address: hookAddress(),
      event,
      args: address ? { lp: address } : undefined,
      fromBlock: f,
      toBlock: t,
    });
    all.push(...chunk);
    f = t + 1n;
  }
  return all;
}

async function fetchAllEvents(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}` | undefined,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<ActivityEvent[]> {
  const [created, exited, reentered, manual] = await Promise.all([
    fetchLogs(client, createdEvent, address, fromBlock, toBlock),
    fetchLogs(client, exitedEvent, address, fromBlock, toBlock),
    fetchLogs(client, reenteredEvent, address, fromBlock, toBlock),
    fetchLogs(client, manualExitEvent, address, fromBlock, toBlock),
  ]);

  const mapped: ActivityEvent[] = [
    ...created.map((l: any) => ({
      _eventName: "Deposited",
      address: l.args.lp as `0x${string}`,
      blockTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      ...l.args,
    })),
    ...exited.map((l: any) => ({
      _eventName: "Exited",
      address: l.args.lp as `0x${string}`,
      blockTimestamp: l.args.timestamp as bigint,
      ...l.args,
    })),
    ...reentered.map((l: any) => ({
      _eventName: "Re-entered",
      address: l.args.lp as `0x${string}`,
      blockTimestamp: l.args.timestamp as bigint,
      ...l.args,
    })),
    ...manual.map((l: any) => ({
      _eventName: "Manual Exit",
      address: l.args.lp as `0x${string}`,
      blockTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      ...l.args,
    })),
  ];

  mapped.sort((a, b) => Number(b.blockTimestamp - a.blockTimestamp));
  return mapped;
}

export function useActivityFeed(address?: `0x${string}`) {
  const maybeClient = usePublicClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastBlockRef = useRef<bigint>(0n);

  useEffect(() => {
    if (!maybeClient) {
      setError("No public client");
      setIsLoading(false);
      return;
    }
    const client = maybeClient;

    let cancelled = false;

    async function fetch() {
      try {
        const latest = await client.getBlockNumber();
        const start = latest > HISTORY_BLOCKS ? latest - HISTORY_BLOCKS : 0n;
        const results = await fetchAllEvents(client, address, start, latest);
        if (!cancelled) {
          setEvents(results);
          setError(null);
          lastBlockRef.current = latest;
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.shortMessage || e?.message || "Failed to load events");
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    fetch();

    const interval = setInterval(fetch, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [address, maybeClient]);

  return { data: events.length > 0 ? events : undefined, isLoading, error };
}
