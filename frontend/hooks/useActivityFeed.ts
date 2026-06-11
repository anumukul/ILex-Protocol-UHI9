'use client'
import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { ILEX_HOOK_ADDRESS, ILEX_HOOK_ABI } from '@/lib/contracts'

export interface ActivityEvent {
  type: 'created' | 'exited' | 'reentered' | 'manual'
  lp: string
  ilBps?: number
  txHash: string
  blockNumber: bigint
  timestamp: number
}

const CREATED_EVENT = ILEX_HOOK_ABI.find(e => e.name === 'PositionCreated') as any
const EXITED_EVENT = ILEX_HOOK_ABI.find(e => e.name === 'PositionExited') as any
const REENTERED_EVENT = ILEX_HOOK_ABI.find(e => e.name === 'PositionReentered') as any
const MANUAL_EVENT = ILEX_HOOK_ABI.find(e => e.name === 'ManualExit') as any

const CHUNK_SIZE = 10000n
const HISTORY_BLOCKS = 100000n

export function useActivityFeed(lpAddress?: `0x${string}`) {
  const publicClient = usePublicClient()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false

    const fetchEvents = async () => {
      try {
        const latest = await publicClient.getBlockNumber()
        const start = latest > HISTORY_BLOCKS ? latest - HISTORY_BLOCKS : 0n

        const [created, exited, reentered, manual] = await Promise.all([
          publicClient.getLogs({ address: ILEX_HOOK_ADDRESS, event: CREATED_EVENT, args: lpAddress ? { lp: lpAddress } : undefined, fromBlock: start, toBlock: latest } as any),
          publicClient.getLogs({ address: ILEX_HOOK_ADDRESS, event: EXITED_EVENT, args: lpAddress ? { lp: lpAddress } : undefined, fromBlock: start, toBlock: latest } as any),
          publicClient.getLogs({ address: ILEX_HOOK_ADDRESS, event: REENTERED_EVENT, args: lpAddress ? { lp: lpAddress } : undefined, fromBlock: start, toBlock: latest } as any),
          publicClient.getLogs({ address: ILEX_HOOK_ADDRESS, event: MANUAL_EVENT, args: lpAddress ? { lp: lpAddress } : undefined, fromBlock: start, toBlock: latest } as any),
        ])

        if (cancelled) return

        const mapped: ActivityEvent[] = [
          ...created.map((log: any) => ({ type: 'created' as const, lp: log.args[0] ?? '', txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: Date.now() / 1000 })),
          ...exited.map((log: any) => ({ type: 'exited' as const, lp: log.args[0] ?? '', ilBps: Number(log.args[2] ?? 0n), txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: Date.now() / 1000 })),
          ...reentered.map((log: any) => ({ type: 'reentered' as const, lp: log.args[0] ?? '', txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: Date.now() / 1000 })),
          ...manual.map((log: any) => ({ type: 'manual' as const, lp: log.args[0] ?? '', txHash: log.transactionHash, blockNumber: log.blockNumber, timestamp: Date.now() / 1000 })),
        ]
          .sort((a, b) => Number(b.blockNumber - a.blockNumber))

        setActivities(mapped)
      } catch (e) {
        console.error('Failed to fetch activity:', e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 15_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [publicClient, lpAddress])

  return { activities, isLoading }
}
