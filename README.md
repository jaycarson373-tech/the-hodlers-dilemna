# HODL or NO HODL

HODL or NO HODL is a Solana holder game about conviction, cooperation, and betrayal. This repository contains the Next.js website, Railway API/worker, and Supabase read model.

Live website: [hodlornohodl.fun](https://hodlornohodl.fun/)

## Game economy

- Episodes and creator-fee sweeps run every 15 minutes.
- Eligible wallets hold at least 1,000,000 tokens.
- Weight is snapshot balance × uninterrupted-hold multiplier.
- The Banker posts a fully funded wallet-specific offer before choices open.
- All accepted deals together can use at most 30% of The Box.
- Silence is HODL. Selling or transferring out is NO HODL and resets the streak.
- At 70% weighted HODL, HODL players split The Box after accepted deals.
- Below 70%, accepted deals are still paid and only the unpaid balance rolls over.
- After three failures, the next episode force-opens for HODL players.
- Payouts go directly to wallets; there is no claim step.

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_TOKEN_MINT=your_public_token_mint
```

The Supabase publishable key and token mint are public identifiers. Never expose a service-role key, wallet keypair, Helius key, or any other secret with a `NEXT_PUBLIC_` prefix.

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the game state, sealed-choice, snapshot, audit, payout, leaderboard, and Realtime feed tables.

## Railway keeper/API

Deploy with `railway/` as the service root. Required variables are listed in [`railway/.env.example`](railway/.env.example).

```bash
cd railway
pnpm install
pnpm typecheck
pnpm build
pnpm start
```

`SWEEP_ENABLED` and `PAYOUT_ENABLED` both default to `false`. Every sweep and payout is audited before broadcast, and every transfer has a persistent idempotency key. The Pump creator wallet can also act as the payout wallet, so a second treasury key is not required.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `programs/holders_dilemna/` — archived optional Anchor prototype; the production game uses the audited Railway/Supabase engine
- `railway/` — wallet authentication, holder verification, keeper, fee collection, and payout API
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/official-mark.jpg`, `public/official-wordmark.jpg` — supplied official branding used unchanged
