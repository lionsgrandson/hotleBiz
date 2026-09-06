# Deployment

## Production topology

GuestAtlas runs its full Next.js server/runtime on **Cloudflare Workers** using `@opennextjs/cloudflare`. Static assets are served by the Worker asset binding. New incident evidence is stored in a private **Cloudflare R2** bucket. A separate Cloudflare Worker owns the daily retention Cron Trigger.

Supabase provides Postgres and Auth behind the Worker. The browser only uses the publishable Auth configuration; business-data access and the Supabase secret key stay server-side.

## Fastest Windows deployment

Put `.env.local` beside the scripts if you already have one, then run:

```text
GO-LIVE.cmd
```

If `.env.local` is missing, `GO-LIVE.cmd` automatically opens `configure.cmd`. `deploy.cmd` is an alias for `GO-LIVE.cmd`.

You do **not** need to know your GuestAtlas production URL before the first deployment. If no custom domain is supplied, the configuration uses automatic Workers.dev mode. Cloudflare assigns a URL such as `https://guestatlas.<account-subdomain>.workers.dev`; the deploy script captures it, updates `.env.local`, rebuilds with the real canonical origin, dry-runs the final bundle again, and redeploys.

### Prerequisites

- Cloudflare account with Workers/R2 enabled
- Supabase project

Git and Node.js 22+ are installed automatically through Windows `winget` when missing and available.

If `CLOUDFLARE_API_TOKEN` is absent, Wrangler opens browser login. If `SUPABASE_ACCESS_TOKEN` is absent, the Supabase CLI prompts login.

## What GO-LIVE.cmd performs

The script is fail-fast and stops at the first error:

1. Syncs GitHub `main` before validation, preserving tracked local edits with autostash.
2. Installs pinned dependencies.
3. Runs the high/critical runtime dependency vulnerability gate.
4. Loads `.env.local` and validates secrets/origin mode.
5. Runs source integrity checks.
6. Runs TypeScript checks.
7. Runs application self-tests.
8. Authenticates Cloudflare.
9. Creates or verifies `guestatlas-evidence` R2.
10. Runs the OpenNext Cloudflare production build.
11. Runs dry-run validation against both generated Worker bundles.
12. Commits and pushes the exact validated source to GitHub `main`.
13. Links the Supabase project, applies migrations and verifies the expected Postgres schema.
14. When using automatic Workers.dev mode, performs a temporary first Worker deployment and captures the assigned public URL from Wrangler output.
15. Rewrites local environment configuration to the assigned URL, rebuilds and dry-runs again.
16. Deploys the final GuestAtlas application Worker.
17. Deploys `guestatlas-maintenance` with the daily `15 2 * * *` Cron Trigger.
18. Deletes temporary deployment logs and secret bundles.

The server secret, encryption keys, matching key, audit key and deployment credentials remain in local/Cloudflare secret storage and are not committed.

## Cloudflare configuration

`wrangler.jsonc` is the source of truth for the application Worker:

- `workers_dev` remains enabled so the first deployment can receive a Cloudflare-managed public origin.
- `nodejs_compat` is enabled for Next.js/OpenNext and Node crypto compatibility.
- `EVIDENCE_BUCKET` binds private R2 bucket `guestatlas-evidence`.
- Smart Placement is enabled because application requests frequently call external database/auth services.
- Observability is enabled.
- Required runtime secrets are declared so missing production configuration causes a deployment error.

`wrangler.maintenance.jsonc` defines the separate retention Cron Worker.

## Evidence migration behavior

All new evidence uses R2 paths prefixed with `r2/`. The evidence download route streams those objects only after MFA, role and source-property authorization.

Existing evidence rows without the `r2/` prefix are treated as legacy Supabase Storage objects and remain readable through the authenticated route. This makes the Cloudflare migration non-destructive. No public R2 bucket or public evidence URL is required.

## Automatic Workers.dev URL

For the first deployment without a custom domain, `.env.local` uses:

```text
NEXT_PUBLIC_APP_URL=https://guestatlas-bootstrap.invalid
GUESTATLAS_URL_MODE=workers_dev_auto
CLOUDFLARE_CUSTOM_DOMAIN=
```

That bootstrap hostname is never intended for users. It is accepted only while automatic discovery is enabled. After the temporary Worker deploy, `scripts/finalize-workers-url.mjs` extracts the real `https://guestatlas.<account-subdomain>.workers.dev` origin from Wrangler output and changes the local file to:

```text
NEXT_PUBLIC_APP_URL=https://guestatlas.<account-subdomain>.workers.dev
GUESTATLAS_URL_MODE=workers_dev_resolved
```

GuestAtlas is then rebuilt and redeployed with that real URL.

## Custom domain later

When you are ready to move away from Workers.dev, set these values consistently in `.env.local`:

```text
NEXT_PUBLIC_APP_URL=https://guestatlas.example.com
GUESTATLAS_URL_MODE=fixed
CLOUDFLARE_CUSTOM_DOMAIN=guestatlas.example.com
```

The custom domain value is a hostname only, with no scheme/path/port. The domain must be in a Cloudflare zone available to the authenticated account.

## Supabase Auth setup

After the first deployment, use the final URL printed by `GO-LIVE.cmd`:

1. Set Auth Site URL to that URL.
2. Allow `<final-url>/auth/confirm` as a redirect.
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
