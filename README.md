# Hodlers Dilemma.fun

Hodlers Dilemma.fun is a Solana game about conviction, cooperation, and betrayal. This repository contains the branded Next.js website, the Anchor program, and the Railway keeper/API.

Live website: [hodlersdilemma.fun](https://www.hodlersdilemma.fun/)

## What is implemented

- Solana Wallet Standard connect and disconnect
- Signed-wallet sessions (no passwords or private-key custody)
- Escrowed token positions with uninterrupted holding streaks
- One-hour on-chain Cooperate/Defect rounds
- Weighted votes, defector bonus, pot rollover, and claim-based SOL payouts
- Permissionless round opening/settlement; Railway pays keeper transaction fees
- Mainnet Pump creator-fee collection on a 15-minute schedule, followed by funding the protocol vault
- Supabase read model for rounds, holders, events, and leaderboard data
- Devnet token faucet for end-to-end testing

This is a devnet safety build. Do not point it at mainnet or accept real funds without an independent program audit, production token configuration, operational monitoring, and legal review.

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
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL editor. Supabase is a public read projection; on-chain program accounts remain the financial source of truth.

## Railway keeper/API

Deploy with `railway/` as the service root. Required variables are listed in [`railway/.env.example`](railway/.env.example).

```bash
cd railway
pnpm install
pnpm typecheck
pnpm build
pnpm start
```

The keeper calls permissionless round maintenance instructions. If `PUMP_CREATOR_KEYPAIR_BASE64` is configured with the token's actual creator wallet, the service collects eligible Pump creator fees every 15 minutes and funds those lamports into the protocol vault. This key must be entered directly into Railway as a secret and must never be committed. Player actions require their wallet signature.

## Solana program

```bash
cargo test -p holders-dilemna --lib
anchor build
anchor deploy --provider.cluster devnet --provider.wallet target/deploy/devnet-admin.json
pnpm --dir railway bootstrap:devnet
```

The bootstrap creates the devnet test mint, initializes one-hour rounds, funds a starter pot, funds the keeper, and writes private deployment values to the git-ignored `target/deploy/devnet-env.txt`.

## Structure

- `app/`, `components/`, `lib/` — website and game console
- `programs/holders_dilemna/` — Anchor program
- `railway/` — wallet authentication, transaction builder, indexer, keeper, and devnet faucet
- `supabase/schema.sql` — read-model schema and RLS policies
- `public/official-mark.jpg`, `public/official-wordmark.jpg` — supplied official branding used unchanged
