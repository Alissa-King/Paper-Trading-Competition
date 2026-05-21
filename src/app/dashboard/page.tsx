'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TradeForm from '@/components/TradeForm'
import Portfolio from '@/components/Portfolio'
import Leaderboard from '@/components/Leaderboard'

// TradingView widget does DOM manipulation — load client-side only
const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false })

const CHART_SYMBOLS: Record<string, string> = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  BNB: 'BINANCE:BNBUSDT',
  AAPL: 'NASDAQ:AAPL',
  TSLA: 'NASDAQ:TSLA',
  NVDA: 'NASDAQ:NVDA',
  MSFT: 'NASDAQ:MSFT',
  AMZN: 'NASDAQ:AMZN',
  GOOGL: 'NASDAQ:GOOGL',
}

export default function DashboardPage() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [selectedAsset, setSelectedAsset] = useState('BTC')
  const [balance, setBalance] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // SSE price stream
  useEffect(() => {
    const es = new EventSource('/api/prices?stream=1')
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.prices) setPrices(data.prices)
    }
    return () => es.close()
  }, [])

  // Fetch balance once
  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.json())
      .then((d) => { if (d.portfolio) setBalance(d.portfolio.balance) })
  }, [refreshKey])

  const handleTradeChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Cash balance:{' '}
            <span className="text-green-400 font-semibold">
              ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Asset tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {Object.keys(CHART_SYMBOLS).map((asset) => (
          <button
            key={asset}
            onClick={() => setSelectedAsset(asset)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              selectedAsset === asset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {asset}
            {prices[asset] && (
              <span className="ml-2 text-xs opacity-70">
                ${prices[asset].toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: chart + portfolio */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <TradingViewChart
              symbol={CHART_SYMBOLS[selectedAsset]}
              height={440}
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">My Portfolio</h2>
            <Portfolio key={refreshKey} onTradeChanged={handleTradeChange} />
          </div>
        </div>

        {/* Right: trade form + leaderboard */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Place Trade</h2>
            <TradeForm
              onTradePlaced={handleTradeChange}
              currentPrices={prices}
              balance={balance}
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  )
}
