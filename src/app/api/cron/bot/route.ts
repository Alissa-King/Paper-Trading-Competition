import { NextRequest, NextResponse } from 'next/server'
import { runBotCycle } from '@/lib/aiBot'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron on schedule. Vercel automatically sends
// Authorization: Bearer <CRON_SECRET>. Also accepts BOT_SECRET for manual triggers.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const botSecret = process.env.BOT_SECRET

  const authorized =
    (!cronSecret && !botSecret) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (botSecret && authHeader === `Bearer ${botSecret}`)

  if (!authorized) {
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
