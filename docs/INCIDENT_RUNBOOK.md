# Wallet and deployment incident runbook

Use this for wallet connection, wallet sign-in, `404`, `502`, CORS, or “Banker call” failures.

## Five-minute triage

1. Do not change code yet.
2. Copy the Railway service root. It must be the API service, not the website, and must not end in `/api`.
3. Run:

   ```bash
   NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app \
   SITE_ORIGIN=https://www.hodlornohodl.fun \
   pnpm preflight:live
   ```

4. Fix only the first failed hop.

| Failure | Meaning | Fix layer |
| --- | --- | --- |
| `/health/live` | Container is not reachable | Railway deploy/domain |
| `/health/ready` | Required runtime config is absent/invalid | Railway variables |
| `/api/status` | Database or game config is not usable | Supabase/runtime config |
| `/api/auth/challenge` | Wallet auth route is broken | API code/session config |
| CORS check | Site origin is not allowed | `SITE_ORIGIN`/CORS |
| All API checks pass, browser fails | Stale build-time URL | Vercel variable + new deployment |

`NEXT_PUBLIC_*` values are baked into the client at build time. Changing one requires a new Vercel deployment.

## Loop breaker

After two failed hypotheses, stop making changes. Record:

- exact failing route and status;
- deployed commit;
- normalized API origin (never include query credentials);
- first failing preflight check;
- current hypothesis and evidence against it.

Do not “try” another builder, port, package manager, schema, or root directory without evidence.

## Credential exposure

If a private key or backend secret was pasted into chat/logs:

1. Rotate it at the provider.
2. Update Railway/Vercel with the replacement.
3. Redeploy.
4. Revoke the old credential.
5. Run the live preflight.

Never put the replacement in chat or a committed file.
