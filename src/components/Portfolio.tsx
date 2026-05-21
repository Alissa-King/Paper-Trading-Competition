'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react'

interface OpenTrade {
  id: string
  asset: string
  direction: string
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
  is_bot_trade: boolean
  created_at: string
}

interface PortfolioStats {
  total_value: number
  unrealized_pnl: number
  pct_return: number
}

interface PortfolioData {
  portfolio: { balance: number; starting_balance: number }
  open_trades: OpenTrade[]
  stats: PortfolioStats
}

interface PortfolioProps {
  onTradeChanged?: () => void
}

export default function Portfolio({ onTradeChanged }: PortfolioProps) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)

  const fetchPortfolio = useCallback(async () => {
    const res = await fetch('/api/portfolio')
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPortfolio()
    const interval = setInterval(fetchPortfolio, 10000)
    return () => clearInterval(interval)
  }, [fetchPortfolio])

  async function closeTrade(tradeId: string) {
    setClosing(tradeId)
    const res = await fetch(`/api/trades?id=${tradeId}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchPortfolio()
      onTradeChanged?.()
    }
    setClosing(null)
  }

  if (loading) {
    return <div className="h-40 bg-gray-800 rounded-lg animate-pulse" />
  }

  if (!data) {
    return <p className="text-gray-500 text-sm">Could not load portfolio</p>
  }

  const { portfolio, open_trades, stats } = data

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Cash Balance"
          value={`$${portfolio.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`of $${portfolio.starting_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Total Return"
          value={`${stats.pct_return >= 0 ? '+' : ''}${stats.pct_return.toFixed(2)}%`}
          positive={stats.pct_return >= 0}
        />
        <StatCard
          label="Unrealized P&L"
          value={`${stats.unrealized_pnl >= 0 ? '+' : ''}$${stats.unrealized_pnl.toFixed(2)}`}
          positive={stats.unrealized_pnl >= 0}
        />
      </div>

      {/* Open positions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-400">Open Positions ({open_trades.length})</h3>
          <button onClick={fetchPortfolio} className="text-gray-600 hover:text-gray-400">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {open_trades.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No open positions</p>
        ) : (
          <div className="space-y-1">
            {open_trades.map((trade) => {
              const pnlPct = (trade.unrealized_pnl / (trade.entry_price * trade.quantity)) * 100
              return (
                <div key={trade.id} className="flex items-center gap-3 p-2.5 bg-gray-800/60 rounded-lg">
                  <div
                    className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                      trade.direction === 'long' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{trade.asset}</span>
                      <span
                        className={`text-xs px-1 rounded font-semibold ${
                          trade.direction === 'long'
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {trade.direction.toUpperCase()}
                      </span>
                      {trade.is_bot_trade && (
                        <span className="text-xs px-1 rounded bg-purple-900/50 text-purple-400">BOT</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {trade.quantity.toFixed(4)} @ ${trade.entry_price.toLocaleString()} → ${trade.current_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p
                      className={`text-sm font-bold ${
                        trade.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {trade.unrealized_pnl >= 0 ? '+' : ''}${trade.unrealized_pnl.toFixed(2)}
                    </p>
                    <p className={`text-xs ${pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </p>
                  </div>
                  <button
                    onClick={() => closeTrade(trade.id)}
                    disabled={closing === trade.id}
                    className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                    title="Close position"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={`text-sm font-bold ${
          positive === undefined
            ? 'text-white'
            : positive
            ? 'text-green-400'
            : 'text-red-400'
        }`}
      >
        {positive !== undefined && (
          positive
            ? <TrendingUp className="inline w-3 h-3 mr-0.5" />
            : <TrendingDown className="inline w-3 h-3 mr-0.5" />
        )}
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  )
}
