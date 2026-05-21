import { Redis } from '@upstash/redis'

// Falls back gracefully when env vars are missing (dev without Redis)
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

export const LEADERBOARD_KEY = 'leaderboard:scores'
export const PRICE_KEY = (asset: string) => `price:${asset}`
export const PRICE_HISTORY_KEY = (asset: string) => `price_history:${asset}`
const PRICE_TTL = 10          // 10 seconds — prices are fresh
const LEADERBOARD_TTL = 30    // 30 seconds — leaderboard cache
const HISTORY_LEN = 100       // last 100 ticks for moving averages

export async function getCachedPrice(asset: string): Promise<number | null> {
  const r = getRedis()
  if (!r) return null
  const val = await r.get<number>(PRICE_KEY(asset))
  return val
}

export async function setCachedPrice(asset: string, price: number): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.setex(PRICE_KEY(asset), PRICE_TTL, price)
  // Append to rolling history list for MA calculations
  await r.lpush(PRICE_HISTORY_KEY(asset), price)
  await r.ltrim(PRICE_HISTORY_KEY(asset), 0, HISTORY_LEN - 1)
}

export async function getPriceHistory(asset: string, periods: number = 20): Promise<number[]> {
  const r = getRedis()
  if (!r) return []
  const history = await r.lrange<number>(PRICE_HISTORY_KEY(asset), 0, periods - 1)
  return history.map(Number)
}

export async function updateLeaderboardScore(userId: string, pctReturn: number): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.zadd(LEADERBOARD_KEY, { score: pctReturn, member: userId })
}

export async function getLeaderboardRank(userId: string): Promise<number> {
  const r = getRedis()
  if (!r) return -1
  // ZREVRANK gives 0-based rank descending (higher score = lower index)
  const rank = await r.zrevrank(LEADERBOARD_KEY, userId)
  return rank !== null ? rank + 1 : -1
}

export async function getCachedLeaderboard(): Promise<string | null> {
  const r = getRedis()
  if (!r) return null
  return r.get<string>('leaderboard:cache')
}

export async function setCachedLeaderboard(data: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.setex('leaderboard:cache', LEADERBOARD_TTL, data)
}
