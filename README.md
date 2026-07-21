# Hodlers Dilemma.fun

Hodlers Dilemma.fun is a Solana game about conviction, cooperation, and betrayal. This repository contains the branded Next.js website, the Railway keeper/API, Supabase game state, and optional Anchor program source.

Live website: [hodlersdilemma.fun](https://www.hodlersdilemma.fun/)

## What is implemented

- Solana Wallet Standard connect and disconnect
- Signed-wallet sessions (no passwords or private-key custody)
- Mainnet SPL token holding verification
- 30-minute Cooperate/Defect rounds
- Weighted votes, defector bonus, pot rollover, and claim-based SOL payouts from the configured payout wallet
- Automatic round opening and settlement from Railway
- Mainnet Pump creator-fee collection on a 15-minute schedule, credited into the next game pot
- Supabase read model for rounds, holders, events, and leaderboard data

The current launch path does not require deploying the Anchor program. Supabase tracks the game state while wallet signatures verify players and mainnet RPC verifies token holdings.

## Website

Requires Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

Vercel needs only:

```dotenv
NEXT_PUBLIC_API_URL=https://your-railway-service.up.railway.app
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL editor. Supabase stores live game state, rounds, votes, claims, events, and leaderboard rows.

## Railway keeper/API

Deploy with `railway/` as the service root. Required variables are listed in [`railway/.env.example`](railway/.env.example).

```bash
cd railway
pnpm install
pnpm typecheck
pnpm build
pnpm start
```

If `PUMP_CREATOR_KEYPAIR_BASE64` is configured with the token's actual creator wallet, the service collects eligible Pump creator fees every 15 minutes and credits those lamports into the next game pot. The same configured payout wallet pays valid reward claims. Player actions require a signed wallet session.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `programs/holders_dilemna/` — optional Anchor program source
- `railway/` — wallet authentication, holder verification, keeper, fee collection, and payout API
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/official-mark.jpg`, `public/official-wordmark.jpg` — supplied official branding used unchanged
