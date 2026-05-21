# PaperTrade — Free Trading Competition Platform

Compete with **$100,000 in virtual cash** against real traders and an AI bot. Real-time prices, live leaderboard, professional charts. Total hosting cost: $0–20/month.

**[Live Demo](#)** · Built with Next.js 14, Supabase, Redis, TradingView

---

## Features

| Feature | Details |
|---|---|
| **Real-time prices** | BTC, ETH, SOL, BNB via CoinGecko · AAPL, TSLA, NVDA, MSFT, AMZN, GOOGL via Alpaca |
| **Trade engine** | Long/short positions, P&L tracking, close anytime |
| **Live leaderboard** | Updates instantly via Supabase Realtime + Redis cache |
| **AI momentum bot** | 20-period SMA strategy — can you beat it? |
| **Pro charts** | TradingView embedded widget, free to use |
| **Auth** | Supabase Auth — email/password, $100k auto-provisioned on signup |

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database + Auth:** Supabase (PostgreSQL + built-in Auth)
- **Cache:** Upstash Redis (leaderboard rankings, price history for bot SMA)
- **Price feeds:** CoinGecko REST API (crypto), Alpaca Market Data (stocks)
- **Charts:** TradingView Embeddable Widget (free, no API key)
- **Deployment:** Vercel (free tier)

## Estimated Cost

| Service | Free tier | Paid |
|---|---|---|
| Vercel | ✅ Free | — |
| Supabase | ✅ Free (500MB, 2 projects) | $25/mo |
| Upstash Redis | ✅ Free (10k req/day) | $0.20/100k req |
| Alpaca | ✅ Free paper trading API | — |
| CoinGecko | ✅ Free (30 req/min) | — |
| **Total** | **$0/mo** | **~$5–25/mo at scale** |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/paper-trading-competition
cd paper-trading-competition
npm install
```

### 2. Create services (all free)

**Supabase:**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy **Project URL** and **anon key** from Settings → API
3. Run `supabase/migrations/001_initial.sql` in the SQL editor

**Alpaca:**
1. Sign up at [alpaca.markets](https://alpaca.markets) (free paper trading)
2. Generate API keys under Paper Trading → API Keys

**Upstash Redis:**
1. Sign up at [upstash.com](https://upstash.com) → Create Database
2. Copy the REST URL and token

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your keys
```

### 4. Set up the AI bot user

1. In Supabase Auth, create a user with email `bot@yourdomain.com`
2. Copy its UUID into `BOT_USER_ID` in `.env.local`
3. Run the bot manually: `curl -X POST http://localhost:3000/api/bot -H "Authorization: Bearer your-bot-secret"`

To automate the bot on a schedule, add a Vercel Cron Job in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/bot", "schedule": "*/15 * * * *" }
  ]
}
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── prices/      # SSE real-time price stream
│   │   ├── trades/      # Place & close trades
│   │   ├── portfolio/   # User portfolio + P&L
│   │   ├── leaderboard/ # Rankings (Redis-cached)
│   │   ├── bot/         # AI bot trigger endpoint
│   │   └── auth/        # Sign up / sign in
│   ├── dashboard/       # Main trading UI
│   └── (auth)/          # Login & register pages
├── components/
│   ├── PriceBar.tsx         # Live ticker bar
│   ├── TradingViewChart.tsx # Embedded pro chart
│   ├── TradeForm.tsx        # Long/short order form
│   ├── Portfolio.tsx        # Open positions + P&L
│   └── Leaderboard.tsx      # Live rankings
├── lib/
│   ├── prices.ts        # CoinGecko + Alpaca fetchers
│   ├── tradeEngine.ts   # Core trade logic
│   ├── aiBot.ts         # Momentum SMA bot
│   ├── redis.ts         # Cache helpers
│   └── supabase/        # Client + server helpers
└── types/               # Shared TypeScript types
```

## Database Schema

```sql
users        -- player profiles (linked to auth.users)
portfolios   -- balance per user, starts at $100,000
trades       -- every trade: entry/exit price, P&L, direction
price_history -- rolling price cache for bot SMA calculation

-- Auto-updated view:
leaderboard  -- % return ranked, joins users + portfolios + trades
```

## Deploy to Vercel

```bash
npx vercel
```

Add all environment variables in Vercel → Project Settings → Environment Variables.

---

## AI Bot Strategy

The bot runs a **simple moving average momentum strategy**:

1. Every 15 minutes (or on demand), evaluate each asset
2. Fetch the 20-period price history from Redis
3. If `current_price > SMA(20) × 1.001` → open/hold LONG
4. If `current_price < SMA(20) × 0.999` → open/hold SHORT
5. If the signal flips, close the existing position and enter the new direction

Each bot position allocates $2,000 of its $100k bankroll. It competes on the same leaderboard as human players.

## License

MIT
