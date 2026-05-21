import { NextRequest, NextResponse } from 'next/server'
import { runBotCycle } from '@/lib/aiBot'

export const dynamic = 'force-dynamic'

// Cron-triggered or manually called to run one bot evaluation cycle.
// Protect with a shared secret so only authorized callers can trigger it.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.BOT_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const botUserId = process.env.BOT_USER_ID
  if (!botUserId) {
    return NextResponse.json({ error: 'BOT_USER_ID not configured' }, { status: 500 })
  }

  try {
    const results = await runBotCycle(botUserId)
    return NextResponse.json({ results, ran_at: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bot cycle failed' },
      { status: 500 }
    )
  }
}

// GET returns bot's current open positions and recent trades (public)
export async function GET() {
  const botUserId = process.env.BOT_USER_ID
  if (!botUserId) return NextResponse.json({ trades: [] })

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [openResult, recentResult] = await Promise.all([
    supabase.from('trades').select('*').eq('user_id', botUserId).eq('status', 'open'),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', botUserId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    open_trades: openResult.data ?? [],
    recent_trades: recentResult.data ?? [],
  })
}
