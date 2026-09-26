# GuestAtlas production deployment

## Topology

GuestAtlas runs on Cloudflare Workers through `@opennextjs/cloudflare`. New evidence is stored in a private Cloudflare R2 bucket. A second Worker runs the retention-queue Cron. Supabase supplies PostgreSQL and Auth.

The browser receives only the Supabase publishable Auth configuration. The Supabase server key, encryption key, matching secret, audit secret, Cloudflare credentials and maintenance secret must remain server-side.

## Direct deployment

Production deployment is intentionally independent of GitHub Actions.

From the project folder on Windows:

```text
GO-LIVE.cmd
```

`deploy.cmd` calls the same script.

The source present in the local folder is what gets built and deployed. The release script never runs Git pull/push/commit/fetch operations.

## Required accounts

- Existing Supabase project.
- Cloudflare account with Workers and R2 available.
- Node.js 22+; `GO-LIVE.cmd` can install/upgrade Node through `winget`.

Wrangler can use an API token or interactive browser login. The Supabase CLI can use `SUPABASE_ACCESS_TOKEN` or interactive login.

## Environment

Use `configure.cmd`. Production validation requires the operator identity and the public privacy/security/accessibility contacts in addition to application secrets. This prevents publishing legal/support pages with placeholders.

`.env.local` is local-only and gitignored.

## Release stages

`GO-LIVE.cmd` is fail-fast:

1. pin the known production origin;
2. install exact dependencies from `package-lock.json`;
3. run the high/critical runtime vulnerability gate;
4. validate environment and source integrity;
5. typecheck;
6. run application cryptography/matching/scoring self-tests;
7. build allow-listed Cloudflare runtime environment bundles;
8. authenticate Cloudflare;
9. verify/create `guestatlas-evidence` R2;
10. build OpenNext;
11. dry-run application Worker;
12. dry-run maintenance Worker;
13. authenticate/link the existing Supabase project;
14. apply Postgres migrations with `supabase db push`;
15. verify database tables;
16. deploy the application Worker;
17. deploy the maintenance Worker;
18. run the live `/api/health` smoke check;
19. delete temporary deployment bundles.

`supabase config push` is intentionally not used.

## Required Supabase Auth dashboard settings

Production origin:

```text
https://guestatlas.mosheschwartzberg.workers.dev
```

Set:

```text
Site URL = https://guestatlas.mosheschwartzberg.workers.dev
Additional redirect = https://guestatlas.mosheschwartzberg.workers.dev/auth/confirm
Additional redirect = https://guestatlas.mosheschwartzberg.workers.dev/auth/recovery
Email confirmation = enabled
TOTP MFA enrollment = enabled
TOTP MFA verification = enabled
Secure password change = enabled
```

The checked-in `supabase/config.toml` is a reference for these Auth values; the production script does not mass-push hosted configuration.

## Post-deploy acceptance

Do not accept real guest information until these checks pass:

- `/` loads the public launch page over HTTPS.
- `/privacy`, `/terms`, `/acceptable-use`, `/accessibility`, `/security` and `/.well-known/security.txt` contain the correct operator/contact information.
- `/api/health` returns `ok: true`.
- Browser response headers contain CSP, HSTS, frame denial, content-type protection, referrer policy and permissions policy.
- Staff signup requires terms/privacy acknowledgement and email confirmation.
- Password reset returns through `/auth/recovery`.
- Staff without AAL2 are routed to MFA and protected APIs reject the request.
- Existing staff must accept the current policy version before private application access.
- Pending/unverified properties cannot process network guest information.
- Exact-match search does not permit name-only lookup and records a business purpose.
- Cross-property views do not reveal contact data, raw evidence or the source property's local timeline.
- Multi-file evidence accepts only supported signatures, size limits and private R2 storage.
- Severity 3–4 and unverified/reported incidents require a second staff reviewer.
- Guest disclosure links expire in seven days, rotate old links, and can be revoked.
- Staff invitations expire and can be revoked.
- Guest disputes withhold challenged adverse records from ordinary network consumers.
- Property retention/contact settings save and are audited.
- R2 has no public bucket/custom public URL.
- Cloudflare Observability shows application and maintenance Worker events.
- Daily `guestatlas-maintenance` Cron exists.
- Supabase security advisors are reviewed.
- Database backup/restore has been tested with a documented recovery procedure.
- A real browser/device accessibility QA pass has been completed.

## Rollback

Application rollback should use a previously validated Cloudflare Worker version/deployment. Database migrations must be designed as forward-compatible; do not blindly reverse a migration that has already accepted production data.

If a deployment creates a security/privacy regression, disable affected network workflows or suspend the affected property/user before debugging. Preserve audit evidence.

## Custom domain

The current production origin is the fixed Workers.dev URL. A future custom domain requires changing the canonical URL consistently in environment configuration, Supabase Auth Site URL/redirects, security.txt canonical URL, and Cloudflare deployment configuration. Do not switch only one layer.
