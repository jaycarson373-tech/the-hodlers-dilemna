# On-Chain Bingo

On-Chain Bingo (`$DILEMMA`) is a Solana holder game where wallets become live bingo cards.

Every 1,000,000 tokens becomes one ticket on the board.

## Game economy

- Fast rounds run every 15 minutes by default.
- Eligible wallets hold the configured minimum amount of `$DILEMMA`.
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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_TOKEN_MINT=your_public_token_mint
NEXT_PUBLIC_CONTRACT_ADDRESS=your_public_token_mint
NEXT_PUBLIC_X_URL=https://x.com/your_handle
NEXT_PUBLIC_COMMUNITY_URL=https://x.com/i/communities/your_community_id
```

Never expose a service-role key, wallet keypair, Helius key, or any other secret with a `NEXT_PUBLIC_` prefix.

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the game state, sealed-choice, snapshot, audit, payout, leaderboard, chat/feed, and Realtime tables.

## Railway keeper/API

Deploy with `railway/` as the service root. Required variables are listed in [`railway/.env.example`](railway/.env.example).

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
DECISION_WINDOW_SECONDS=900
BOX_ALLOCATION_BPS=8000
BANKER_ALLOCATION_BPS=2000
AIRDROP_ALLOCATION_BPS=0
MIN_HOLDING_TOKENS=1000000
```

`SWEEP_ENABLED` and `PAYOUT_ENABLED` both default to `false`. Every sweep and payout is audited before broadcast, and every transfer has a persistent idempotency key.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `railway/` — wallet authentication, holder verification, keeper, fee collection, chat, and payout API
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/holders-dilemma-logo.png`, `public/holders-dilemma-banner.png`, `public/holders-dilemma-og.png`, `app/icon.jpg`, `app/apple-icon.jpg` — launch metadata and brand assets
