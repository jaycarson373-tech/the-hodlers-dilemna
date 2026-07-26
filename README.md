# On-Chain Bingo

On-Chain Bingo (`$BINGO`) is a Solana bingo game where wallets become live cards.

Every 1,000,000 tokens becomes one ticket on the board.

## Game economy

- Fast rounds run every 15 minutes by default.
- Eligible wallets hold the configured minimum amount of `$BINGO`.
- Every full 1,000,000 tokens becomes one live ticket.
- Creator fees split 80% to the main bingo pool and 20% to the jackpot pool.
- The board draws a winning wallet card from eligible tickets.
- Jackpot rounds can trigger a second bonus reveal after the normal winner.
- Payouts go directly to wallets; there is no claim step.

## Website

Requires Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

Vercel needs only public values:

```dotenv
NEXT_PUBLIC_API_URL=https://your-railway-service.up.railway.app
NEXT_PUBLIC_SITE_URL=https://www.bingopump.fun
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-scoped-public-rpc.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_TOKEN_MINT=your_public_token_mint
NEXT_PUBLIC_CONTRACT_ADDRESS=your_public_token_mint
NEXT_PUBLIC_X_URL=https://x.com/your_handle
NEXT_PUBLIC_COMMUNITY_URL=https://x.com/i/communities/your_community_id
LAUNCH_STATE=prelaunch
```

Never expose a service-role key, wallet keypair, Helius key, or any other secret with a `NEXT_PUBLIC_` prefix.

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the Bingo game state, private draw seeds, public commitments, holder snapshots, audit log, idempotent payouts, leaderboard, feed, and Realtime tables.

## Railway keeper/API

Deploy from the repository root. Leave Railway Root Directory, custom build command, and custom start command empty; [`Dockerfile`](Dockerfile) and [`railway.json`](railway.json) own the deployment. Required variables are listed in [`railway/.env.example`](railway/.env.example).

```bash
cd railway
pnpm install
pnpm typecheck
pnpm build
pnpm start
```

Current production defaults:

```dotenv
FEE_COLLECTION_INTERVAL_MS=900000
ROUND_LENGTH_SECONDS=900
BINGO_CALLS_PER_GAME=20
BINGO_JACKPOT_ODDS=25
MAIN_ALLOCATION_BPS=8000
JACKPOT_ALLOCATION_BPS=2000
MIN_HOLDING_TOKENS=1000000
```

`SWEEP_ENABLED` and `PAYOUT_ENABLED` both default to `false`. Every sweep and payout is audited before broadcast, and every transfer has a persistent idempotency key.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `railway/` — wallet authentication, ticket verification, keeper, fee collection, chat, and payout API
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/onchain-bingo-logo.svg`, `public/onchain-bingo-og.svg`, `public/og.png`, `app/icon.jpg`, `app/apple-icon.jpg` — launch metadata and brand assets
