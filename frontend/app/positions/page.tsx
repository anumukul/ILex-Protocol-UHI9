'use client'
import { useActivityFeed } from '@/hooks/useActivityFeed'

export default function PositionsPage() {
  const { activities, isLoading } = useActivityFeed()

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-3xl font-black text-white">Protocol Activity</h1>
      <p className="mb-8 text-gray-500">All ILex positions and automation events</p>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">Loading events...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-left font-medium text-gray-500">Event</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">LP</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Detail</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Tx</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((item, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <span className={`font-medium ${
                      item.type === 'created' ? 'text-emerald-400' :
                      item.type === 'exited' ? 'text-yellow-400' :
                      item.type === 'reentered' ? 'text-cyan-400' : 'text-gray-400'
                    }`}>
                      {item.type === 'created' ? 'Protected' :
                       item.type === 'exited' ? 'Auto-Exited' :
                       item.type === 'reentered' ? 'Re-Entered' : 'Manual Exit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    {String(item.lp).slice(0, 6)}...{String(item.lp).slice(-4)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {item.type === 'exited' && item.ilBps !== undefined
                      ? `IL at exit: ${(item.ilBps / 100).toFixed(2)}%`
                      : '\u2014'}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://sepolia.uniscan.xyz/tx/${item.txHash}`}
                      target="_blank" rel="noreferrer"
                      className="font-mono text-xs text-purple-400 hover:text-purple-300"
                    >
                      {String(item.txHash).slice(0, 8)}...↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {activities.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-600">No events yet</div>
          )}
        </div>
      )}
    </div>
  )
}
