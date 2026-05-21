'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trophy, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import type { LeaderboardEntry } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    const res = await fetch('/api/leaderboard')
    const data = await res.json()
    if (data.entries) {
      setEntries(data.entries)
      setLastUpdated(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLeaderboard()

    // Real-time updates via Supabase
    const supabase = createClient()
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portfolios' },
        () => { fetchLeaderboard() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLeaderboard])

  const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard
        </h2>
        <button
          onClick={fetchLeaderboard}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No players yet — be the first!</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div
              key={entry.user_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 transition-colors"
            >
              <span
                className={`text-sm font-bold w-5 text-center ${medalColors[i] ?? 'text-gray-500'}`}
              >
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{entry.username}</p>
                <p className="text-xs text-gray-500">
                  ${entry.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })} •{' '}
                  {entry.closed_trades} trades
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-bold flex items-center gap-1 justify-end ${
                    entry.pct_return >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {entry.pct_return >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {entry.pct_return >= 0 ? '+' : ''}{entry.pct_return}%
                </p>
                <p
                  className={`text-xs ${
                    entry.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {entry.total_pnl >= 0 ? '+' : ''}${entry.total_pnl.toFixed(0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-600 mt-2 text-center">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
