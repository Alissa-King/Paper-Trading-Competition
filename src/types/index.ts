export interface User {
  id: string
  username: string
  avatar_url?: string
  created_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  balance: number
  starting_balance: number
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  asset: string
  asset_type: 'stock' | 'crypto'
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price?: number
  pnl: number
  status: 'open' | 'closed'
  is_bot_trade: boolean
  created_at: string
  closed_at?: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  avatar_url?: string
  balance: number
  starting_balance: number
  pct_return: number
  closed_trades: number
  open_trades: number
  total_pnl: number
}

export interface PriceData {
  asset: string
  price: number
  change24h?: number
  change24hPct?: number
  timestamp: number
}

export type AssetType = 'stock' | 'crypto'

export const SUPPORTED_ASSETS = {
  crypto: ['BTC', 'ETH', 'SOL', 'BNB'],
  stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL'],
} as const

export const ASSET_COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
}
