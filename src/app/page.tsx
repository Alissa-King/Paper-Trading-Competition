import Link from 'next/link'
import { TrendingUp, Trophy, Bot, Zap } from 'lucide-react'
import Leaderboard from '@/components/Leaderboard'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-full px-4 py-1.5 text-green-400 text-sm font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" /> Live prices • Zero risk • 100% free
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5">
          Trade Stocks & Crypto<br />
          <span className="text-green-400">with $100,000 Virtual Cash</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Compete against real traders and an AI bot. Real-time prices from Alpaca and CoinGecko.
          No money, no risk — just glory.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-colors"
          >
            Start Trading Free →
          </Link>
          <Link
            href="/dashboard"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-green-400" />}
            title="Real-Time Prices"
            body="BTC, ETH, AAPL, TSLA and more — live prices every 5 seconds via CoinGecko and Alpaca APIs."
          />
          <FeatureCard
            icon={<Bot className="w-6 h-6 text-purple-400" />}
            title="AI Momentum Bot"
            body="Compete against an AI running a 20-period SMA strategy. Can you beat the algorithm?"
          />
          <FeatureCard
            icon={<Trophy className="w-6 h-6 text-yellow-400" />}
            title="Live Leaderboard"
            body="Rankings update in real-time via Supabase subscriptions. Track your % return against every player."
          />
        </div>
      </section>

      {/* Live leaderboard preview */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <Leaderboard />
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
    </div>
  )
}
