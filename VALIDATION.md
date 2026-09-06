# Validation status

GuestAtlas is now validated as a Cloudflare Workers application rather than a Vercel deployment.

## Automated release checks

`GO-LIVE.cmd` is fail-fast and executes these checks before production deployment:

1. Exact dependency installation.
2. Environment validation.
3. Source/deployment integrity scan.
4. TypeScript validation.
5. Weighted-score and cryptography/matching self-tests.
6. OpenNext Cloudflare production build.
7. Wrangler production bundle dry-run.
8. Git push of the exact validated source.
9. Supabase migration and schema verification.
10. Main Worker deployment and scheduled-maintenance Worker deployment.

`npm run self-test` checks weighted scoring, 0–100 reputation output, confidence thresholds, rebook-rate calculation, AES-256-GCM encrypt/decrypt round-trip, deterministic normalized HMAC matching, identifier-domain separation and token helpers.

The source checker requires the OpenNext config, Cloudflare Worker config, private R2 evidence binding, maintenance Worker, observability, `nodejs_compat`, exact dependency pins and `GO-LIVE.cmd`. It rejects the retired Vercel deployment path and scans for obvious committed secrets and stale product branding.

## Cloudflare-specific checks

- `npm run cf:build` compiles Next.js through `@opennextjs/cloudflare`.
- `wrangler deploy --dry-run --outdir .cloudflare-dry-run` validates the generated Worker bundle without publishing it.
- `GO-LIVE.cmd` verifies or creates the `guestatlas-evidence` R2 bucket before deployment.
- New evidence is written to R2 and downloaded only through the authenticated application route.
- Legacy Supabase Storage evidence remains readable during migration.
- The maintenance Worker is independently deployable and observable.

## Current validation run

A GitHub Actions workflow performs a fresh networked dependency installation, source check, typecheck, self-test, OpenNext Cloudflare build and Wrangler dry-run on every push to `main` and on pull requests. Its result is the dependency-resolved build gate for this repository.

Do not treat a local source push as sufficient if this workflow is red. Fix the failing step and rerun it.

## Launch validation still required

Before accepting real guest data, complete the post-deploy checks in `DEPLOYMENT.md`, browser/device QA, authentication/MFA flows, real R2 upload/download tests, Supabase security advisors, Cloudflare WAF/rate-limit configuration, backup/restore testing, and an external security/privacy review.
