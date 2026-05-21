'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { SUPPORTED_ASSETS, ASSET_COINGECKO_IDS } from '@/types'

interface TradeFormProps {
  onTradePlaced?: () => void
  currentPrices?: Record<string, number>
  balance?: number
}

const ALL_ASSETS = [
  ...SUPPORTED_ASSETS.crypto.map((s) => ({ symbol: s, type: 'crypto' as const })),
  ...SUPPORTED_ASSETS.stocks.map((s) => ({ symbol: s, type: 'stock' as const })),
]

function getTVSymbol(asset: string, type: string) {
  if (type === 'crypto') return `BINANCE:${asset}USDT`
  const exchanges: Record<string, string> = {
    AAPL: 'NASDAQ:AAPL', TSLA: 'NASDAQ:TSLA', NVDA: 'NASDAQ:NVDA',
    MSFT: 'NASDAQ:MSFT', AMZN: 'NASDAQ:AMZN', GOOGL: 'NASDAQ:GOOGL',
  }
  return exchanges[asset] ?? `NYSE:${asset}`
}

export default function TradeForm({ onTradePlaced, currentPrices = {}, balance = 0 }: TradeFormProps) {
  const [asset, setAsset] = useState('BTC')
  const [assetType, setAssetType] = useState<'crypto' | 'stock'>('crypto')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [usdAmount, setUsdAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const currentPrice = currentPrices[asset]
  const estQty = currentPrice && usdAmount ? (parseFloat(usdAmount) / currentPrice) : null
  const maxPercents = [25, 50, 75, 100]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(usdAmount)
    if (!amount || amount <= 0) return

    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset,
        asset_type: assetType,
        direction,
        usd_amount: amount,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage({ text: data.error ?? 'Trade failed', ok: false })
    } else {
      setMessage({ text: data.message, ok: true })
      setUsdAmount('')
      onTradePlaced?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Asset selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">Asset</label>
        <select
          value={asset}
          onChange={(e) => {
            const found = ALL_ASSETS.find((a) => a.symbol === e.target.value)
            setAsset(e.target.value)
            if (found) setAssetType(found.type)
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <optgroup label="Crypto">
            {SUPPORTED_ASSETS.crypto.map((s) => (
              <option key={s} value={s}>{s}/USD</option>
            ))}
          </optgroup>
          <optgroup label="Stocks">
            {SUPPORTED_ASSETS.stocks.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </optgroup>
        </select>
        {currentPrice && (
          <p className="text-xs text-gray-500 mt-1">
            Current: ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Direction */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">Direction</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('long')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-semibold transition-colors
              ${direction === 'long'
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-700'}`}
          >
            <TrendingUp className="w-4 h-4" /> Long
          </button>
          <button
            type="button"
            onClick={() => setDirection('short')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-semibold transition-colors
              ${direction === 'short'
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-700'}`}
          >
            <TrendingDown className="w-4 h-4" /> Short
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">Amount (USD)</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="number"
            min="1"
            max={balance}
            step="100"
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Quick % buttons */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          {maxPercents.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setUsdAmount((Math.floor(balance * pct / 100)).toString())}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded py-1 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>
        {estQty !== null && (
          <p className="text-xs text-gray-500 mt-1">
            ≈ {estQty.toFixed(asset === 'BTC' || asset === 'ETH' ? 6 : 4)} {asset}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !usdAmount}
        className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors
          ${direction === 'long'
            ? 'bg-green-600 hover:bg-green-500 disabled:bg-green-900'
            : 'bg-red-600 hover:bg-red-500 disabled:bg-red-900'}
          text-white disabled:cursor-not-allowed`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Placing…' : `Place ${direction.toUpperCase()}`}
      </button>

      {message && (
        <p className={`text-xs rounded-lg p-2 ${message.ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
          {message.text}
        </p>
      )}
    </form>
  )
}
