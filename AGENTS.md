# Holders Dilemma agent operating rules

These rules are mandatory for every agent working in this repository.

## Connectivity incidents: isolate before editing

For wallet sign-in, `404`, `502`, CORS, Railway, Vercel, or environment-variable failures:

1. Run `pnpm preflight` before changing code.
2. Reproduce the failing URL and identify the first broken hop:
   browser config -> Railway `/health/live` -> `/health/ready` -> `/api/status` -> `/api/auth/challenge`.
3. State one falsifiable hypothesis and test it.
4. Do not change UI copy, game rules, Supabase schema, package manager, builder, port, or deployment platform unless evidence identifies that layer.
5. After two failed hypotheses, stop editing. Produce a short evidence table and re-scope before trying a third fix.

The canonical live check is:

```bash
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app \
SITE_ORIGIN=https://www.holdersdilemma.fun \
pnpm preflight:live
```

## One deployment path

- Website: Vercel, using `pnpm run build:vercel`.
- API: Railway from the repository root, using `/railway.json` + `/Dockerfile`.
- Railway Root Directory: empty (repository root).
- Railway custom build/start commands: empty. The Dockerfile owns both.
- Railway health check: `/health/ready`.
- Database: Supabase schema in `supabase/schema.sql`.

Do not add another `railway.toml`, Nixpacks/Railpack path, GitHub Pages deploy, package-manager version, or port fallback.

## Secrets

- Never ask the user to paste a private key, seed phrase, service-role/secret key, session secret, or RPC key into chat.
- Never echo a secret provided by the user.
- If a secret appears in chat, logs, a screenshot, or a commit, stop and tell the user to rotate it. Refer only to the environment-variable name.
- Run `pnpm secrets:check` before committing.
- Private values belong only in Railway/Vercel/Supabase secret stores. Examples contain placeholders only.

## Solana/mainnet safety

- Do not sign, simulate, send, collect, or transfer on mainnet as part of diagnosis.
- Read-only RPC checks are allowed; redact RPC query credentials from output.
- Do not change token mint, wallet roles, payout behavior, round timing, or holding thresholds during a connectivity fix.

## Required verification

Before claiming a fix is complete:

```bash
pnpm verify
```

For a deployed wallet/API fix, also run `pnpm preflight:live` with the real public API URL. A frontend build alone is not proof that wallet sign-in works.
