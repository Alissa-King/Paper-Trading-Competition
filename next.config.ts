import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow TradingView widget scripts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com https://www.tradingview.com",
              "frame-src 'self' https://www.tradingview.com",
              "img-src 'self' data: https://www.tradingview.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.coingecko.com https://data.alpaca.markets https://*.upstash.io",
              "style-src 'self' 'unsafe-inline'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
