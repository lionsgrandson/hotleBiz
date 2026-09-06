# Security controls

## Implemented controls

- Mandatory TOTP MFA by default (`REQUIRE_MFA=true`).
- Request-specific Supabase SSR clients and current cookie/cache-header handling inside Cloudflare Workers.
- Server-only Supabase secret key; no guest-table browser access.
- RLS enabled plus direct `anon`/`authenticated` application-table privileges revoked.
- Database triggers enforce guest/hotel/stay consistency even for privileged server writes.
- Hotel-side dispute correction is transactional through a server-only Postgres function.
- AES-256-GCM encryption for guest identity and guest-linked free text/operational references.
- HMAC-SHA256 exact-match identifiers with a separate secret.
- Exact-match/intersection guest search; no public/name-only directory.
- 15-minute audited network access grants.
- Business-purpose capture and per-user daily network search limit.
- New property verification gate before network data processing.
- Least-privilege hotel roles and staff revocation.
- Same-origin checks on state-changing HTTP routes.
- Two-person approval for severity 3–4 incidents.
- Private Cloudflare R2 evidence bucket, randomized object paths, 10 MB max, MIME allowlist and SHA-256 hashes.
- Evidence is streamed only through an authenticated Worker route; no public R2 or signed evidence URL is required.
- Raw evidence denied to viewer role and non-source properties.
- Backward-compatible authenticated access to legacy Supabase Storage evidence.
- Append-only audit log trigger and revision records for dispute corrections.
- Challenged incidents and stay feedback are withheld from other properties until the source property resolves the dispute.
- Cloudflare `CF-Connecting-IP` is HMAC-hashed before application audit persistence; raw client IP is not retained in the application audit row.
- Security headers and dynamic authenticated pages.
- Separate Cloudflare scheduled Worker authenticates retention-queue refresh with `CRON_SECRET`.
- Cloudflare Worker Observability is enabled for the application and maintenance workers.
- Environment validation blocks placeholder/weak launch secrets and mismatched custom-domain/app origins.
- Deployment secret bundles use an allowlist and explicitly omit Cloudflare/Supabase deployment credentials.
- `GO-LIVE.cmd` performs source checks, typecheck, self-tests, Cloudflare production build and Wrangler dry-run before source push or production migration/deploy.

## Production operations still required

- Restrict Cloudflare and Supabase administration to the smallest operator set.
- Scope the Cloudflare deployment API token to only the resources needed by this project; prefer Wrangler interactive OAuth when practical for individual developer machines.
- Keep the R2 bucket private and do not attach a public/custom R2 domain.
- Enable reliable Postgres backups and test restores.
- Configure production SMTP for authentication mail.
- Store runtime secrets only in Cloudflare Worker secret management; never commit `.env.local` or temporary secret bundles.
- Add Cloudflare WAF/rate-limit rules around authentication, network search, guest portal and evidence endpoints after observing legitimate traffic patterns.
- Configure alerting for search spikes, failed auth, evidence reads, role changes, moderation anomalies, Worker exceptions and scheduled-job failures.
- Establish key rotation, security incident response, staff offboarding and periodic membership review.
- Run dependency review, Supabase security/performance advisors, staging integration tests and application penetration testing before launch.
- Verify Cloudflare caching never caches authenticated responses containing user sessions or private evidence.

## Threats explicitly addressed

Network scraping, identifier fishing, leaked guest UUIDs, false-positive identity merging, source-hotel travel/contact disclosure, defamatory/speculative incident submissions, self-approval of serious accusations, public evidence links, read-only evidence overreach, plaintext database leaks, cross-site writes, stale staff access, deployment-secret leakage and SSR/CDN session leakage.
