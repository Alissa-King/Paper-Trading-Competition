/**
 * AI Momentum Bot
 *
 * Strategy: Simple moving average crossover.
 * - If current price > 20-period SMA → go LONG
 * - If current price < 20-period SMA → go SHORT
 * - If already in a position that matches the signal, hold.
 * - If the signal flips, close the existing position and open the new one.
 *
 * The bot runs under a dedicated service-account user (BOT_USER_ID env var).
 * Trigger via POST /api/bot to run one evaluation cycle across all assets.
 */

import { getPriceHistory, getCachedPrice } from './redis'
import { placeTrade, closeTrade } from './tradeEngine'
import { createClient } from './supabase/server'
import { SUPPORTED_ASSETS } from '@/types'

const BOT_TRADE_SIZE_USD = 2000 // allocate $2k per position

export type BotSignal = 'long' | 'short' | 'hold'

export function computeSMA(prices: number[]): number | null {
  if (prices.length === 0) return null
  return prices.reduce((a, b) => a + b, 0) / prices.length
}

export function getMomentumSignal(currentPrice: number, priceHistory: number[]): BotSignal {
  const sma = computeSMA(priceHistory)
  if (sma === null) return 'hold'
  if (currentPrice > sma * 1.001) return 'long'   // 0.1% buffer to avoid noise
  if (currentPrice < sma * 0.999) return 'short'
  return 'hold'
}

export interface BotRunResult {
  asset: string
  signal: BotSignal
  action: 'opened_long' | 'opened_short' | 'closed_and_flipped' | 'held' | 'skipped'
  message: string
}

export async function runBotCycle(botUserId: string): Promise<BotRunResult[]> {
  const supabase = await createClient()
  const results: BotRunResult[] = []

  const assets = [
    ...SUPPORTED_ASSETS.crypto.map((s) => ({ symbol: s, type: 'crypto' as const })),
    ...SUPPORTED_ASSETS.stocks.map((s) => ({ symbol: s, type: 'stock' as const })),
  ]

  // Fetch bot's open positions
  const { data: openTrades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', botUserId)
    .eq('status', 'open')
    .eq('is_bot_trade', true)

  const openByAsset: Record<string, { id: string; direction: string }> = {}
  for (const t of openTrades ?? []) {
    openByAsset[t.asset] = { id: t.id, direction: t.direction }
  }

  for (const { symbol, type } of assets) {
    try {
      const currentPrice = await getCachedPrice(symbol)
      if (!currentPrice) {
        results.push({ asset: symbol, signal: 'hold', action: 'skipped', message: 'No price data' })
        continue
      }

      const history = await getPriceHistory(symbol, 20)
      if (history.length < 10) {
        results.push({
          asset: symbol,
          signal: 'hold',
          action: 'skipped',
          message: 'Insufficient history for SMA',
        })
        continue
      }

      const signal = getMomentumSignal(currentPrice, history)
      const existing = openByAsset[symbol]

      if (signal === 'hold') {
        results.push({ asset: symbol, signal, action: 'held', message: 'No clear momentum' })
        continue
      }

      // Already in the right direction — hold
      if (existing?.direction === signal) {
        results.push({
          asset: symbol,
          signal,
          action: 'held',
          message: `Holding existing ${signal} position`,
        })
        continue
      }

      // Close existing if it's the wrong direction
      if (existing) {
        await closeTrade(existing.id, botUserId)
      }

      // Open new position
      const result = await placeTrade({
        userId: botUserId,
        asset: symbol,
        assetType: type,
        direction: signal,
        usdAmount: BOT_TRADE_SIZE_USD,
        isBotTrade: true,
      })

      results.push({
        asset: symbol,
        signal,
        action: existing ? 'closed_and_flipped' : `opened_${signal}`,
        message: result.message,
      })
    } catch (err) {
      results.push({
        asset: symbol,
        signal: 'hold',
        action: 'skipped',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return results
}
