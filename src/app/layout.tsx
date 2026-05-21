import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import PriceBar from '@/components/PriceBar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaperTrade — Free Trading Competition',
  description:
    'Compete with $100,000 in virtual money. Trade stocks and crypto in real-time. Climb the leaderboard.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="antialiased bg-gray-950 text-white min-h-screen">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-white">
              <span className="text-green-400 text-xl">📈</span>
              <span>PaperTrade</span>
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a>
              <a href="/login" className="text-gray-400 hover:text-white transition-colors">Login</a>
              <a
                href="/register"
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
              >
                Join Free
              </a>
            </div>
          </div>
        </nav>
        <PriceBar />
        <main>{children}</main>
      </body>
    </html>
  )
}
