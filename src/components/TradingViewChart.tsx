'use client'

import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string  // e.g. 'NASDAQ:AAPL' or 'BINANCE:BTCUSDT'
  height?: number
}

export default function TradingViewChart({ symbol, height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !widgetRef.current) return

    // Clear TradingView's previously injected iframe, preserve the widget div itself
    widgetRef.current.innerHTML = ''
    containerRef.current.querySelectorAll('script').forEach(s => s.remove())

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: '5',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    containerRef.current.appendChild(script)

    return () => {
      containerRef.current?.querySelectorAll('script').forEach(s => s.remove())
      if (widgetRef.current) widgetRef.current.innerHTML = ''
    }
  }, [symbol])

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height }}>
      <div
        ref={widgetRef}
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}
