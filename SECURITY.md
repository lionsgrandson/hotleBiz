# Security controls

## Implemented controls

- Mandatory TOTP MFA by default (`REQUIRE_MFA=true`).
- Request-specific Supabase SSR clients and current cookie/cache-header handling.
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
- Private evidence bucket, randomized object paths, 10 MB max, MIME allowlist and SHA-256 hashes.
- Raw evidence denied to viewer role and non-source properties.
- Append-only audit log trigger and revision records for dispute corrections.
- Challenged incidents and stay feedback are withheld from other properties until the source property resolves the dispute.
- Security headers and dynamic authenticated pages.
- Vercel cron secret for retention-queue refresh.
- Environment validation blocks placeholder/weak launch secrets.

## Production operations still required

- Restrict Supabase project/database/network administration to the smallest operator set.
- Enable reliable backups and test restores.
- Configure production SMTP for authentication mail.
- Put all server secrets in Vercel/Supabase secret management; never commit `.env.local`.
- Add edge/WAF rate limits and bot protection around Auth, search and guest portal endpoints.
- Configure monitoring/alerts for search spikes, failed auth, evidence reads, role changes and moderation anomalies.
- Establish key rotation, security incident response, staff offboarding and periodic membership review.
- Run dependency, Supabase security/performance advisors and application penetration testing before launch.
- Verify CDN behavior never caches authenticated `Set-Cookie` responses.

## Threats explicitly addressed

Network scraping, identifier fishing, leaked guest UUIDs, false-positive identity merging, source-hotel travel/contact disclosure, defamatory/speculative incident submissions, self-approval of serious accusations, public evidence links, read-only evidence overreach, plaintext database leaks, cross-site writes, stale staff access and SSR/CDN session leakage.
