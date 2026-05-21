/**
 * Trade Engine
 *
 * All monetary math uses plain numbers (USD). In a real system you'd use
 * BigDecimal, but for a portfolio competition the float precision is fine.
 */

import { createClient } from './supabase/server'
import { getPrice } from './prices'
import { updateLeaderboardScore } from './redis'
import type { Trade, Portfolio } from '@/types'

export interface PlaceTradeParams {
  userId: string
  asset: string
  assetType: 'stock' | 'crypto'
  direction: 'long' | 'short'
  /** USD amount to allocate */
  usdAmount: number
  isBotTrade?: boolean
}

export interface PlaceTradeResult {
  trade: Trade
  portfolio: Portfolio
  message: string
}

export async function placeTrade(params: PlaceTradeParams): Promise<PlaceTradeResult> {
  const { userId, asset, assetType, direction, usdAmount, isBotTrade = false } = params

  if (usdAmount <= 0) throw new Error('Trade amount must be positive')
  if (usdAmount < 1) throw new Error('Minimum trade size is $1')

  const price = await getPrice(asset)
  if (!price) throw new Error(`Could not fetch price for ${asset}`)

  const supabase = await createClient()

  // Fetch current portfolio balance
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (pErr || !portfolio) throw new Error('Portfolio not found')

  if (usdAmount > portfolio.balance) {
    throw new Error(`Insufficient balance. Available: $${portfolio.balance.toLocaleString()}`)
  }

  const quantity = usdAmount / price
  const newBalance = portfolio.balance - usdAmount

  // Insert trade
  const { data: trade, error: tErr } = await supabase
    .from('trades')
    .insert({
      user_id: userId,
      asset,
      asset_type: assetType,
      direction,
      quantity,
      entry_price: price,
      is_bot_trade: isBotTrade,
    })
    .select()
    .single()

  if (tErr || !trade) throw new Error(`Failed to place trade: ${tErr?.message}`)

  // Deduct from balance
  const { data: updatedPortfolio, error: uErr } = await supabase
    .from('portfolios')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (uErr || !updatedPortfolio) throw new Error('Failed to update portfolio')

  return {
    trade,
    portfolio: updatedPortfolio,
    message: `Opened ${direction.toUpperCase()} ${asset} @ $${price.toLocaleString()} — ${quantity.toFixed(6)} units`,
  }
}

export interface CloseTradeResult {
  trade: Trade
  portfolio: Portfolio
  pnl: number
  message: string
}

export async function closeTrade(tradeId: string, userId: string): Promise<CloseTradeResult> {
  const supabase = await createClient()

  const { data: trade, error: tErr } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .eq('status', 'open')
    .single()

  if (tErr || !trade) throw new Error('Open trade not found')

  const exitPrice = await getPrice(trade.asset)
  if (!exitPrice) throw new Error(`Could not fetch exit price for ${trade.asset}`)

  const pnl = calculatePnL(trade.direction, trade.entry_price, exitPrice, trade.quantity)
  const proceeds = trade.quantity * exitPrice + (trade.direction === 'short' ? -pnl * 2 : 0)
  // Long PnL: (exit - entry) * qty
  // Short PnL: (entry - exit) * qty
  // Proceeds = initial_cost + pnl
  const initialCost = trade.quantity * trade.entry_price
  const returnAmount = initialCost + pnl

  const { data: updatedTrade } = await supabase
    .from('trades')
    .update({
      exit_price: exitPrice,
      pnl,
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', tradeId)
    .select()
    .single()

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('balance, starting_balance')
    .eq('user_id', userId)
    .single()

  const newBalance = (portfolio?.balance ?? 0) + returnAmount
  const { data: updatedPortfolio } = await supabase
    .from('portfolios')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  // Sync leaderboard score in Redis
  if (updatedPortfolio) {
    const pctReturn =
      ((updatedPortfolio.balance - updatedPortfolio.starting_balance) /
        updatedPortfolio.starting_balance) *
      100
    await updateLeaderboardScore(userId, pctReturn)
  }

  return {
    trade: updatedTrade!,
    portfolio: updatedPortfolio!,
    pnl,
    message: `Closed ${trade.direction.toUpperCase()} ${trade.asset} @ $${exitPrice.toLocaleString()} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
  }
}

export function calculatePnL(
  direction: string,
  entryPrice: number,
  currentPrice: number,
  quantity: number
): number {
  if (direction === 'long') {
    return (currentPrice - entryPrice) * quantity
  }
  return (entryPrice - currentPrice) * quantity
}

export async function getOpenTradesWithPnL(
  userId: string
): Promise<(Trade & { unrealized_pnl: number; current_price: number })[]> {
  const supabase = await createClient()
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (!trades?.length) return []

  const assets = [...new Set(trades.map((t) => t.asset))]
  const pricePromises = assets.map(async (a) => [a, await getPrice(a)] as [string, number | null])
  const priceEntries = await Promise.all(pricePromises)
  const priceMap = Object.fromEntries(priceEntries.filter(([, p]) => p !== null))

  return trades.map((t) => ({
    ...t,
    current_price: priceMap[t.asset] ?? t.entry_price,
    unrealized_pnl: calculatePnL(
      t.direction,
      t.entry_price,
      priceMap[t.asset] ?? t.entry_price,
      t.quantity
    ),
  }))
}
