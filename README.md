# The Hodler’s Dilemna

Frontend landing page for **The Hodler’s Dilemna**, an on-chain social experiment about conviction, cooperation, betrayal, and the prisoner’s dilemma. It includes real Solana Wallet Standard connection for compatible browser wallets.

## Run locally

Requires Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production check

```bash
pnpm build
pnpm lint
```

## Structure

- `app/` — page shell, metadata, and global styling
- `components/` — reusable landing-page components, interactions, and Solana wallet connection
- `lib/experiment-data.ts` — tiers, leaderboard, feed, streak, matrix, and mechanic data
- `public/` — local static assets

The decision controls, countdowns, public signals, leaderboard, and feed are illustrative frontend previews. Wallet connection exposes only the connected public address and does not request a signature or transaction. This version has no backend, smart contracts, live voting, tracking, or fee distribution.
