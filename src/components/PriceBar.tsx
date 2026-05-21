'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceItem {
  asset: string
  price: number
  prev?: number
}

export default function PriceBar() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const prevPrices = useRef<Record<string, number>>({})

  useEffect(() => {
    const es = new EventSource('/api/prices?stream=1')

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.prices) {
        prevPrices.current = prices
        setPrices(data.prices)
      }
    }

    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items: PriceItem[] = Object.entries(prices).map(([asset, price]) => ({
    asset,
    price,
    prev: prevPrices.current[asset],
  }))

  if (items.length === 0) {
    return (
      <div className="w-full bg-gray-900 border-b border-gray-800 px-4 py-2 flex gap-6 overflow-x-auto text-xs text-gray-500">
        Loading prices…
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-900 border-b border-gray-800 px-4 py-2 flex gap-6 overflow-x-auto scrollbar-hide">
      {items.map(({ asset, price, prev }) => {
        const up = prev === undefined ? null : price >= prev
        return (
          <span key={asset} className="flex items-center gap-1 whitespace-nowrap text-xs font-mono">
            <span className="text-gray-400 font-sans font-semibold">{asset}</span>
            <span
              className={
                up === null
                  ? 'text-white'
                  : up
                  ? 'text-green-400 animate-pulse'
                  : 'text-red-400 animate-pulse'
              }
            >
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {up !== null && (
              up
                ? <TrendingUp className="w-3 h-3 text-green-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </span>
        )
      })}
    </div>
  )
}
