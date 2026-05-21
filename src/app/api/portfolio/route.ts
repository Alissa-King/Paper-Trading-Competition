import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenTradesWithPnL } from '@/lib/tradeEngine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [portfolioResult, openTrades, closedTradesResult] = await Promise.all([
    supabase.from('portfolios').select('*').eq('user_id', user.id).single(),
    getOpenTradesWithPnL(user.id),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(20),
  ])

  const portfolio = portfolioResult.data
  if (!portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  const unrealizedPnL = openTrades.reduce((sum, t) => sum + t.unrealized_pnl, 0)
  const totalValue = portfolio.balance + openTrades.reduce((sum, t) => sum + t.quantity * t.entry_price, 0)
  const pctReturn = ((portfolio.balance - portfolio.starting_balance) / portfolio.starting_balance) * 100

  return NextResponse.json({
    portfolio,
    open_trades: openTrades,
    closed_trades: closedTradesResult.data ?? [],
    stats: {
      total_value: totalValue,
      unrealized_pnl: unrealizedPnL,
      pct_return: pctReturn,
    },
  })
}
