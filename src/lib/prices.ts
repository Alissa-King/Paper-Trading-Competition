/**
 * Price service — fetches live prices from CoinGecko (crypto) and
 * Alpaca (stocks). Both have free tiers; no API key needed for CoinGecko
 * basic endpoints. Alpaca requires a free paper-trading account.
 *
 * All fetched prices are written to Redis for low-latency reads.
 */

import { setCachedPrice, getCachedPrice } from './redis'
import { ASSET_COINGECKO_IDS } from '@/types'

// ── CoinGecko ──────────────────────────────────────────────────────────────

interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number
    usd_24h_change?: number
  }
}

export async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => ASSET_COINGECKO_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(',')

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 10 } }
  )

  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

  const data: CoinGeckoResponse = await res.json()
  const prices: Record<string, number> = {}

  for (const symbol of symbols) {
    const coinId = ASSET_COINGECKO_IDS[symbol.toUpperCase()]
    if (coinId && data[coinId]) {
      prices[symbol.toUpperCase()] = data[coinId].usd
      await setCachedPrice(symbol.toUpperCase(), data[coinId].usd)
    }
  }

  return prices
}

// ── Alpaca ─────────────────────────────────────────────────────────────────

const ALPACA_BASE = 'https://data.alpaca.markets/v2'

interface AlpacaLatestTrade {
  trades: Record<string, { p: number; t: string }>
}

export async function fetchStockPrices(symbols: string[]): Promise<Record<string, number>> {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET

  if (!apiKey || !apiSecret) {
    // Return mock prices in dev when Alpaca creds are absent
    return getMockStockPrices(symbols)
  }

  const joined = symbols.join(',')
  const res = await fetch(`${ALPACA_BASE}/stocks/trades/latest?symbols=${joined}&feed=iex`, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
    },
    next: { revalidate: 5 },
  })

  if (!res.ok) {
    console.error(`Alpaca error: ${res.status}`)
    return getMockStockPrices(symbols)
  }

  const data: AlpacaLatestTrade = await res.json()
  const prices: Record<string, number> = {}

  for (const symbol of symbols) {
    const trade = data.trades?.[symbol]
    if (trade) {
      prices[symbol] = trade.p
      await setCachedPrice(symbol, trade.p)
    }
  }

  return prices
}

// ── Aggregated ──────────────────────────────────────────────────────────────

export async function fetchAllPrices(): Promise<Record<string, number>> {
  const [crypto, stocks] = await Promise.allSettled([
    fetchCryptoPrices(['BTC', 'ETH', 'SOL', 'BNB']),
    fetchStockPrices(['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL']),
  ])

  return {
    ...(crypto.status === 'fulfilled' ? crypto.value : {}),
    ...(stocks.status === 'fulfilled' ? stocks.value : {}),
  }
}

export async function getPrice(asset: string): Promise<number | null> {
  const cached = await getCachedPrice(asset)
  if (cached !== null) return cached

  const upper = asset.toUpperCase()
  if (ASSET_COINGECKO_IDS[upper]) {
    const prices = await fetchCryptoPrices([upper])
    return prices[upper] ?? null
  }

  const prices = await fetchStockPrices([upper])
  return prices[upper] ?? null
}

// ── Mock fallback for local dev ─────────────────────────────────────────────

const MOCK_PRICES: Record<string, number> = {
  AAPL: 195.5,
  TSLA: 245.0,
  NVDA: 875.0,
  MSFT: 415.0,
  AMZN: 185.0,
  GOOGL: 172.0,
}

function getMockStockPrices(symbols: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const s of symbols) {
    const base = MOCK_PRICES[s] ?? 100
    // Add ±0.5% noise so it feels live
    result[s] = parseFloat((base * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2))
  }
  return result
}
