# Deployment

## Recommended topology

Vercel runs the Next.js application. Supabase provides Postgres, Auth and private Storage. Use the current Supabase publishable key in the browser and the secret key only on the server.

## Windows production deployment

1. Install Node.js 22+.
2. Run `configure.cmd` and enter the Supabase project values plus your production app URL. The wizard automatically generates the application encryption/matching/audit/cron secrets.
3. Optional `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN` make deployment non-interactive.
4. Run `deploy.cmd`.

The script installs dependencies (`npm ci` when a lockfile exists; otherwise `npm install`), validates environment secrets, typechecks, performs a production Next.js build, links/pushes Supabase migrations, verifies expected tables/private evidence storage, links the Vercel project, synchronizes required Production environment variables (server secrets are marked sensitive), then deploys production. It stops immediately on any failed stage.

## First-account bootstrap

After the web/database deployment:

1. Configure Supabase Auth Site URL and `/auth/confirm` redirect.
2. Create the first user and enroll TOTP MFA.
3. Create the first property; it will remain `pending`.
4. Set `PLATFORM_ADMIN_EMAILS` to your bootstrap administrator email.
5. Run `node scripts/promote-admin.mjs your@email.com` from the project directory; the script loads `.env.local` itself.
6. Visit `/platform` and verify the first property.

## Vercel environment

`deploy.cmd` runs `scripts/sync-vercel-env.mjs` after the local Vercel project is linked. It synchronizes the required Production variables and marks server-only secrets sensitive. Deployment credentials (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`) are intentionally not copied into the runtime application. `vercel.json` schedules the retention queue refresh route daily; Vercel authenticates it with `CRON_SECRET`.

## Docker option

The included Dockerfile installs dependencies, runs typecheck + production build, and starts `next start`. Terminate TLS at a trusted reverse proxy and provide the same environment variables at runtime.

## Post-deploy acceptance checks

- `/api/health` returns 200.
- `npm run verify` sees all expected tables and private `incident-evidence` bucket.
- Staff without MFA are routed to `/mfa` and API writes/searches fail.
- A pending property cannot create/search network guest data.
- Name-only guest lookup fails.
- Multiple search identifiers must resolve to the same person.
- Cross-property guest views hide contact details/local travel timeline.
- Severity 3/4 incident requires a different manager/admin/owner for publication.
- Viewer cannot obtain raw evidence.
- Guest portal token cannot access another guest and expires.
- Property/member revocation takes effect immediately.

## Supabase Auth email template

For the **Confirm signup** template, point the confirmation link at:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Set the Auth Site URL to `NEXT_PUBLIC_APP_URL` and allow `NEXT_PUBLIC_APP_URL/auth/confirm` as a redirect URL. The application route accepts both PKCE `code` callbacks and `token_hash` confirmations.
