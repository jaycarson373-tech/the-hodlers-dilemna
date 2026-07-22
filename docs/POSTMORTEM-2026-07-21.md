# Postmortem: wallet/API configuration incident (2026-07-21)

## Summary

Wallet sign-in failed because the frontend's Railway API base URL was not handled robustly. The final direct fix was commit `c52b9b9`: four changed lines that add `https://` when the configured value is a bare hostname.

Instead of proving that first, the troubleshooting expanded into unrelated layers: Railway ports and roots, pnpm/Corepack, Nixpacks, Docker, Vercel, Supabase schema, CORS, game timing, page design, and public copy. Several of those changes addressed real secondary problems, but combining them made the incident slow and made it impossible to know which change fixed wallet sign-in.

## Impact

- Roughly three hours of user time across implementation, deployment, screenshots, repeated redeploys, and re-explaining settings.
- At least 11 production commits between the first environment/config edits and the final URL normalization.
- Multiple contradictory deployment instructions were given.
- Sensitive backend credentials were pasted into the Codex thread and must be treated as compromised.

## Follow-up production finding

The public website and Railway service currently return HTTP 200, but the game is not healthy:

- `currentRound` is `0`;
- no round is active;
- `nextRoundAt` is overdue;
- `/api/events` returns 500;
- `/api/leaderboard` returns 500.

This strongly indicates an incomplete/incompatible Supabase schema or keeper failure. The old health endpoint does not detect it. The new readiness and live-preflight checks do.

## Evidence timeline

| Time (ET) | Commit/event | What changed |
| --- | --- | --- |
| 16:45 | `a2a1867` | Token holding config changed during deployment troubleshooting |
| 17:06 | `471d8ee` | Round timing changed |
| 17:09 | `3ddecfc` | Dead Railway URL error wording changed |
| 17:15 | `0f7bbe7` | Separate game page added |
| 17:24 | `e34a990` | Railway deployment path changed |
| 17:31 | `e8065ab` | Railway changed to Docker |
| 17:33 | `1f86c68` | pnpm version changed |
| 18:00 | `8052396` | API deployment and branding changed together |
| 18:02 | `946e57d` | CORS changed |
| 18:09 | `9a224b4` | Preview UI/mobile wallet modal changed |
| 18:12 | `c52b9b9` | Bare Railway hostname normalized to HTTPS—the direct wallet-config fix |

## Root causes

1. **No first-broken-hop test.** The agent did not begin with the public API URL, `/health`, `/api/status`, and `/api/auth/challenge` in that order.
2. **Health was a false positive.** The deployed `/health` returned `ok: true` even with `keeper: false`, and did not prove that the round scheduler, database schema, mint, or auth path worked.
3. **Configuration had several owners.** Dashboard overrides, root scripts, `railway.json`, `railway/railway.toml`, Nixpacks, Docker, npm, and pnpm all became possible deployment paths.
4. **A build-time variable was treated like runtime state.** Vercel embeds `NEXT_PUBLIC_*` values into the client build; changing the value without a fresh deployment cannot fix the existing bundle.
5. **Scope was not held.** UI, branding, schema, gameplay, and infrastructure were edited during a connectivity incident.
6. **Secret handling failed.** Private/backend credentials were accepted and repeated in chat instead of being rejected and immediately rotated.

## Correct diagnosis sequence

The incident should have been handled as:

1. Normalize and validate `NEXT_PUBLIC_API_URL`.
2. Probe Railway liveness.
3. Probe Railway readiness.
4. Probe `/api/status`.
5. Probe `/api/auth/challenge` and CORS.
6. Change only the first failing layer.
7. Redeploy Vercel once if a `NEXT_PUBLIC_*` value changed.

Expected time for the direct URL fix and verification: minutes, not hours.

## Preventive actions implemented

- URL-normalization unit tests, including a bare Railway hostname.
- Keypair parsing tests for JSON, base58, and strict base64.
- One `pnpm preflight:live` check for liveness, readiness, game status, scheduler progress, wallet auth, and CORS.
- Separate `/health/live` and `/health/ready` endpoints.
- Railway promotion gated on full readiness.
- One Railway deployment path: root Dockerfile + `railway.json`.
- Locked Docker dependencies; no npm/pnpm mixing.
- Removed the duplicate Railway config and GitHub Pages deployment.
- Redacted secret scanner in local verification and CI.
- Mandatory incident and secret-handling rules in `AGENTS.md`.
- Two-hypothesis loop breaker before any third infrastructure change.

## Required manual security action

Rotate every credential that appeared in the Codex thread or screenshots, update provider secret stores, redeploy, and revoke the old credentials. Never place replacement values in chat or the repository.
