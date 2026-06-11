'use client'
import { useActivityFeed } from '@/hooks/useActivityFeed'

interface ActivityFeedProps {
  lpAddress?: `0x${string}`
  limit?: number
}

export default function ActivityFeed({ lpAddress, limit }: ActivityFeedProps) {
  const { activities, isLoading } = useActivityFeed(lpAddress)
  const items = limit ? activities.slice(0, limit) : activities

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-4 text-sm font-medium text-gray-400">Activity</h3>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-600">Loading events...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-600">No activity yet</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  item.type === 'created' ? 'bg-emerald-500' :
                  item.type === 'exited' ? 'bg-yellow-500' :
                  item.type === 'reentered' ? 'bg-cyan-500' : 'bg-gray-500'
                }`} />
                <span className="text-gray-400">
                  {item.type === 'created' ? 'Protected' :
                   item.type === 'exited' ? 'Auto-Exited' :
                   item.type === 'reentered' ? 'Re-Entered' : 'Manual Exit'}
                </span>
              </div>
              {item.type === 'exited' && item.ilBps !== undefined && (
                <span className="text-xs text-gray-600">
                  IL: {item.ilBps}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
