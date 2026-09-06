# Deployment

## Production topology

GuestAtlas runs its full Next.js server/runtime on **Cloudflare Workers** using `@opennextjs/cloudflare`. Static assets are served by the Worker asset binding. New incident evidence is stored in a private **Cloudflare R2** bucket. A separate Cloudflare Worker owns the daily retention Cron Trigger.

Supabase provides Postgres and Auth behind the Worker. The browser only uses the publishable Auth configuration; business-data access and the Supabase secret key stay server-side.

## Fastest Windows deployment

Run:

```text
configure.cmd
GO-LIVE.cmd
```

`deploy.cmd` is an alias for `GO-LIVE.cmd`.

### Prerequisites

- Node.js 22+
- npm
- Git
- Cloudflare account with Workers/R2 enabled
- Supabase project

If `CLOUDFLARE_API_TOKEN` is absent, Wrangler opens browser login. If `SUPABASE_ACCESS_TOKEN` is absent, the Supabase CLI prompts login.

## What GO-LIVE.cmd performs

The script is fail-fast and stops at the first error:

1. Installs pinned dependencies.
2. Loads `.env.local` and validates secrets/origins.
3. Runs source integrity checks.
4. Runs TypeScript checks.
5. Runs application self-tests.
6. Authenticates Cloudflare.
7. Creates or verifies `guestatlas-evidence` R2.
8. Runs the OpenNext Cloudflare production build.
9. Runs `wrangler deploy --dry-run` against the generated Worker bundle.
10. Commits/pulls/rebases/pushes the exact validated source to GitHub `main`.
11. Links the Supabase project and applies migrations.
12. Verifies the expected Postgres schema.
13. Builds sanitized JSON secret bundles. Cloudflare/Supabase deployment tokens are never copied into Worker runtime secrets.
14. Deploys the main GuestAtlas Worker. If `CLOUDFLARE_CUSTOM_DOMAIN` is configured, it is attached as a Cloudflare Custom Domain.
15. Deploys `guestatlas-maintenance` with the daily `15 2 * * *` Cron Trigger.

Temporary secret bundle files are deleted both after success and after failure.

## Cloudflare configuration

`wrangler.jsonc` is the source of truth for the application Worker:

- `nodejs_compat` is enabled for Next.js/OpenNext and Node crypto compatibility.
- `EVIDENCE_BUCKET` binds private R2 bucket `guestatlas-evidence`.
- Smart Placement is enabled because application requests frequently call external database/auth services.
- Observability is enabled.
- Required runtime secrets are declared so missing production configuration causes a deployment error.

`wrangler.maintenance.jsonc` defines the separate retention Cron Worker.

## Evidence migration behavior

All new evidence uses R2 paths prefixed with `r2/`. The evidence download route streams those objects only after MFA, role and source-property authorization.

Existing evidence rows without the `r2/` prefix are treated as legacy Supabase Storage objects and remain readable through the authenticated route. This makes the Cloudflare migration non-destructive. No public R2 bucket or public evidence URL is required.

## Custom domain

Set both values consistently in `.env.local`:

```text
NEXT_PUBLIC_APP_URL=https://guestatlas.example.com
CLOUDFLARE_CUSTOM_DOMAIN=guestatlas.example.com
```

The custom domain value is a hostname only, with no scheme/path/port. The domain must be in a Cloudflare zone available to the authenticated account.

If no custom domain is configured, the application remains available on its Workers.dev hostname after deployment.

## Supabase Auth setup

After the first deployment:

1. Set Auth Site URL to `NEXT_PUBLIC_APP_URL`.
2. Allow `NEXT_PUBLIC_APP_URL/auth/confirm` as a redirect.
3. Set the Confirm signup template link to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

4. Create the first account and enroll TOTP MFA.
5. Create the first property.
6. Ensure your bootstrap email is listed in `PLATFORM_ADMIN_EMAILS`.
7. Run `node scripts/promote-admin.mjs your@email.com`.
8. Visit `/platform` and verify the property.

## Post-deploy acceptance checks

- `/api/health` returns 200.
- The `guestatlas` Worker shows requests/logs in Cloudflare Observability.
- `guestatlas-evidence` exists and is not publicly exposed.
- Uploading incident evidence creates an `evidence_files.storage_path` starting with `r2/`.
- Evidence download requires MFA and a permitted source-property role.
- `guestatlas-maintenance` has the daily Cron Trigger.
- `npm run verify` sees all expected Postgres tables.
- Staff without MFA are routed to `/mfa` and API writes/searches fail.
- A pending property cannot create/search network guest data.
- Name-only guest lookup fails.
- Multiple search identifiers must resolve to the same person.
- Cross-property views hide contact details/local travel timeline/raw evidence.
- Severity 3/4 incidents require a second authorized reviewer.
- Guest portal tokens expire and cannot cross guest boundaries.
- Property/member revocation takes effect immediately.
