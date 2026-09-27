# GuestAtlas

GuestAtlas is a multi-property hotel guest feedback, incident, dispute and guest-rights network. It is designed as verified hospitality intelligence, not a public people directory or automatic blacklist.

Production URL: `https://guestatlas.mosheschwartzberg.workers.dev`

## Production architecture

- Cloudflare Workers runs the Next.js application through OpenNext.
- Cloudflare R2 stores new incident evidence in the private `guestatlas-evidence` bucket.
- Cloudflare Observability is enabled on the application and maintenance workers.
- A scheduled Cloudflare maintenance Worker refreshes retention candidates.
- Supabase Postgres + Auth provide the transactional database and identity service.
- Guest/business tables are server-accessed; the browser uses Supabase for authentication only.
- Server-only Supabase credentials, PII keys, matching keys and audit hashing keys are not exposed to client code.
- GitHub Actions are not required for production deployment.

## Product surfaces

- Platform administration: `/platform`
- Hotel dashboard: `/dashboard`
- Guests, stays, feedback and incidents
- Serious-incident moderation
- Disputes and correction workflow
- Guest access-link administration and revocation
- Privacy/data-rights request administration: `/privacy-center`
- Audit log and retention queue
- Team and role administration
- Public guest-rights information: `/guest-rights`
- Private guest portal: `/guest-portal/<secure-token>`
- Password recovery: `/forgot-password`

## Included production controls

- Multi-property membership with owner, admin, manager, reviewer and viewer roles.
- Platform property verification before network processing.
- Supabase Auth with TOTP MFA required for authenticated hotel operations.
- Password recovery with generic request responses to reduce account enumeration.
- Exact/intersection guest matching using HMAC identifiers rather than searchable plaintext.
- AES-256-GCM encryption for guest identity and guest-linked narrative fields.
- Short-lived, purpose-bound cross-property access grants.
- Stay-linked feedback and incidents.
- Six-dimension weighted hospitality score; incidents do not secretly alter the numerical score.
- Severity 3-4 incidents require independent moderation.
- Private evidence uploads with MIME allowlist, file signature checks, size limits, randomized keys and SHA-256 hashes.
- Authenticated evidence streaming only.
- Guest portal for disclosure, JSON export, individual disputes and broader privacy requests.
- Data-rights workflow for access, export, rectification, erasure, restriction and objection.
- Guest access-link expiry, usage tracking and revocation.
- Immutable audit/revision history for material workflows.
- Configurable retention review queue. Destructive erasure remains human-reviewed.
- No fully automated booking-denial function.
- Prohibited sensitive/protected-characteristic data documented in policy.
- Security headers, HSTS and private-route no-store/no-index controls.
- Local Windows production deployment with validation and dry-run gates.

## Rating model

Six 1-5 dimensions are weighted:

- Cleanliness: 20%
- Property care: 20%
- Respect toward staff: 15%
- Noise/disturbance: 15%
- Payment conduct: 15%
- Policy compliance: 15%

The weighted 1-5 result is displayed as 0-100. Serious incidents remain separate records with their own evidence, severity, moderation and dispute state.

## Production deployment

The primary production entry point is:

`UPLOAD-PRODUCTION.cmd`

`GO-LIVE.cmd` and `deploy.cmd` are compatibility aliases that call it.

The CMD runs locally on Windows and does not use GitHub Actions or a GitHub-hosted runner. It:

1. Pins the canonical GuestAtlas production URL.
2. Installs the exact lockfile dependencies.
3. Fails on high/critical production dependency advisories.
4. Validates production environment values and source integrity.
5. Runs TypeScript and application self-tests.
6. Builds allow-listed temporary Cloudflare secret bundles.
7. Authenticates Cloudflare and verifies/creates the private R2 evidence bucket.
8. Builds OpenNext and dry-runs the application and maintenance workers.
9. Links the existing Supabase project.
10. Applies committed Postgres migrations only.
11. Verifies the expected schema.
12. Deploys the application and maintenance workers.
13. Deletes temporary secret bundles.

The release intentionally does not run `supabase config push`, create a Supabase project/branch, or enable optional paid Supabase resources.

## Required local configuration

Run `configure.cmd` and provide real production values. Production validation refuses placeholder legal/support contacts.

Required launch configuration includes:

- Supabase URL, publishable key and server secret
- Supabase project ref
- PII encryption key
- matching secret
- audit hashing secret
- cron secret
- legal operator/company name
- monitored privacy contact email
- monitored support email
- optional platform-admin bootstrap emails
- optional transactional-email provider credentials

## Supabase Auth production settings

Verify in Supabase Dashboard:

```text
Site URL = https://guestatlas.mosheschwartzberg.workers.dev
Redirect = https://guestatlas.mosheschwartzberg.workers.dev/auth/confirm
TOTP MFA enrollment = enabled
TOTP MFA verification = enabled
Confirm email = enabled
```

The same allowed `/auth/confirm` redirect is used for password recovery; the application validates the requested post-confirmation path before redirecting.

For signup confirmation, use the Auth email template pattern:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Free-tier policy

The production CMD operates only against the existing Supabase project and committed database migrations. It does not create branches, paid add-ons, vector buckets or custom Supabase domains.

Cloudflare R2 is used for evidence because GuestAtlas requires private object storage. Confirm actual account pricing/limits before commercial launch; the deployment script does not purchase a plan.

## Legal and operational launch gate

Technical controls do not establish legal compliance by themselves. Before accepting real guest data:

- finalize the operator/controller/processor structure and participating-hotel agreements;
- complete the Israel Amendment 13 registration/notification/DPO analysis where applicable;
- complete GDPR/UK GDPR analysis where applicable;
- approve privacy notice, terms, acceptable-use, retention, security incident and law-enforcement procedures;
- document guest identity-verification and dispute-escalation procedures;
- review data residency, subprocessors and international-transfer terms;
- test backups and restores;
- run Supabase security/performance advisors;
- conduct authorization/BOLA, auth recovery, MFA, CSRF, XSS, upload, token leakage and abuse testing;
- run accessibility and load testing;
- configure monitoring, alerting, WAF/rate limits and operational ownership.

See `PRODUCTION_READINESS.md`, `LEGAL_AND_PRIVACY.md`, `SECURITY.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` and `VALIDATION.md`.

## Local development

Run `setup-local.cmd`, then:

- `npm run dev`
- `npm run cf:preview`
- `UPLOAD-PRODUCTION.cmd` for the validated production upload
