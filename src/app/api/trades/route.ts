import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { placeTrade, closeTrade, getOpenTradesWithPnL } from '@/lib/tradeEngine'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PlaceTradeSchema = z.object({
  asset: z.string().min(1).max(10).toUpperCase(),
  asset_type: z.enum(['stock', 'crypto']),
  direction: z.enum(['long', 'short']),
  usd_amount: z.number().positive().max(100_000),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PlaceTradeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { asset, asset_type, direction, usd_amount } = parsed.data

  try {
    const result = await placeTrade({
      userId: user.id,
      asset,
      assetType: asset_type,
      direction,
      usdAmount: usd_amount,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Trade failed' },
      { status: 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') ?? 'open'

  if (status === 'open') {
    const trades = await getOpenTradesWithPnL(user.id)
    return NextResponse.json({ trades })
  }

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ trades: trades ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tradeId = req.nextUrl.searchParams.get('id')
  if (!tradeId) return NextResponse.json({ error: 'Missing trade id' }, { status: 400 })

  try {
    const result = await closeTrade(tradeId, user.id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Close trade failed' },
      { status: 400 }
    )
  }
}
