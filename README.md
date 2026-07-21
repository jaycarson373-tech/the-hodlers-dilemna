# HODL or NO HODL

HODL or NO HODL is a Solana holder game about conviction, cooperation, and betrayal. This repository contains the Next.js website, Railway API/worker, and Supabase read model.

Live website: [hodlornohodl.fun](https://hodlornohodl.fun/)

## Upgrade status

The full upgrade is being delivered in five ordered pull requests. Phase 1 covers the public game explanation and live-panel read surface only:

- seeded simulation fallback when live configuration is unavailable
- exact 70% cooperation rules and streak ladder
- pot rollover display
- Supabase Realtime Banker Feed with a scripted simulation fallback
- six-hour episode, final-hour decision, and 15-minute fee-sweep copy

Authentication, sealed voting, settlement, payouts, and the final player-room redesign are intentionally reserved for later phases.

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

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. The Phase 1 schema adds the public `feed_events` stream, its Realtime publication, and the rollover counter used by the site.

## Railway keeper/API

Deploy with `railway/` as the service root. Required variables are listed in [`railway/.env.example`](railway/.env.example).

```bash
cd railway
pnpm install
pnpm typecheck
pnpm build
pnpm start
```

Fund-moving behavior is not enabled by Phase 1. The later worker phase adds feature-flagged, audited, idempotent sweep and payout execution.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `programs/holders_dilemna/` — optional Anchor program source
- `railway/` — wallet authentication, holder verification, keeper, fee collection, and payout API
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/official-mark.jpg`, `public/official-wordmark.jpg` — supplied official branding used unchanged
