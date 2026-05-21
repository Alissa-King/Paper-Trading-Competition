/**
 * GET /api/prices
 * Returns latest prices for all supported assets.
 * Uses Redis cache first; falls back to live fetch.
 *
 * GET /api/prices?stream=1
 * Opens a Server-Sent Events stream that pushes price updates every 5s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchAllPrices } from '@/lib/prices'
import { getCachedPrice } from '@/lib/redis'
import { SUPPORTED_ASSETS } from '@/types'

const ALL_ASSETS = [...SUPPORTED_ASSETS.crypto, ...SUPPORTED_ASSETS.stocks]

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const stream = req.nextUrl.searchParams.get('stream')

  if (stream) {
    return sseStream(req)
  }

  // Try Redis cache first; fall back to live fetch for any missing
  const prices: Record<string, number> = {}
  const missing: string[] = []

  await Promise.all(
    ALL_ASSETS.map(async (asset) => {
      const cached = await getCachedPrice(asset)
      if (cached !== null) {
        prices[asset] = cached
      } else {
        missing.push(asset)
      }
    })
  )

  if (missing.length > 0) {
    const fresh = await fetchAllPrices()
    Object.assign(prices, fresh)
  }

  return NextResponse.json({ prices, timestamp: Date.now() })
}

function sseStream(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Immediate first push
      try {
        const prices = await fetchAllPrices()
        send({ prices, timestamp: Date.now() })
      } catch {
        send({ error: 'Failed to fetch prices' })
      }

      // Push every 5 seconds
      const interval = setInterval(async () => {
        try {
          const prices = await fetchAllPrices()
          send({ prices, timestamp: Date.now() })
        } catch {
          send({ error: 'Price fetch failed' })
        }
      }, 5000)

      // Cleanup when client disconnects
      req.signal?.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

