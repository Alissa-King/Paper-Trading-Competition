import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedLeaderboard, setCachedLeaderboard } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Try Redis cache first
  const cached = await getCachedLeaderboard()
  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const payload = { entries: data, timestamp: Date.now() }
  await setCachedLeaderboard(JSON.stringify(payload))

  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
