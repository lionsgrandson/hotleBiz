# GuestAtlas

GuestAtlas is a controlled hospitality intelligence network for participating properties. It records verified guest relationships, structured stay feedback, and factual incident records while preserving auditability, moderation, and guest access/correction rights.

It is **not** a public people directory, a name-browsing database, or an automatic booking blacklist.

## Production architecture

- Next.js 16 on Cloudflare Workers through OpenNext.
- Cloudflare R2 private bucket for new evidence uploads.
- Separate Cloudflare maintenance Worker with a daily retention-queue Cron Trigger.
- Supabase Auth + PostgreSQL.
- Business data is server-side only; the browser uses Supabase for authentication.
- AES-256-GCM encryption for core guest identity and guest-linked free text.
- Keyed HMAC exact-match identifiers for network lookup.
- Individual staff accounts, email confirmation, TOTP MFA, role-based access, revocation, and audit logging.

Production origin:

```text
https://guestatlas.mosheschwartzberg.workers.dev
```

## Product surface

### Public
- Launch page describing the service and safeguards.
- Privacy Notice.
- Network Terms.
- Acceptable Use Policy.
- Cookie Notice.
- Accessibility Statement.
- Security / responsible-disclosure page and `/.well-known/security.txt`.
- Guest-rights instructions.
- Public sitemap and robots policy.

### Hotel staff
- Verified multi-property workspaces.
- Roles: owner, admin, manager, reviewer, viewer.
- Versioned staff terms/privacy acknowledgement.
- Property verification before guest-network processing.
- Exact-match search by ID/passport, email, phone, or full-name + date-of-birth combination.
- Recorded business purpose and daily per-user lookup limit.
- Short-lived network record access grants.
- Local guest/stay relationship tracking.
- Six-dimension stay feedback.
- Incident documentation with factual-content attestation.
- Up to five evidence files per incident, validated by size, MIME and file signature.
- Independent moderation for severity 3–4 incidents and all unverified/reported incidents.
- Private evidence download authorization.
- Guest dispute/correction resolution with transactional revision history.
- Staff invitation lifecycle and revocation.
- Guest disclosure-link lifecycle, automatic rotation and revocation.
- Audit log and retention queue.
- Property privacy-contact and retention settings.
- Platform-admin property verification.

### Guests
Guests do not create staff accounts. A property can issue a private, time-limited disclosure link after identity verification. The guest can view the network information connected to their record and challenge individual feedback or incident records. Challenged adverse records are withheld from ordinary network consumers while reviewed.

## Direct Windows deployment — no GitHub Actions

Run:

```text
GO-LIVE.cmd
```

`deploy.cmd` is an alias.

The deploy script operates from the source already on your computer. It does **not** pull, commit, push, run, or depend on GitHub. GitHub may still be used separately as source control.

The script:

1. Ensures Node.js 22+.
2. Runs `npm ci` from the lockfile.
3. Fails on high/critical production dependency advisories.
4. Validates production environment/operator configuration.
5. Runs source integrity checks, TypeScript, and self-tests.
6. Authenticates Cloudflare.
7. Creates/verifies the private R2 bucket.
8. Builds and dry-runs the application and maintenance Workers.
9. Authenticates and links the existing Supabase project.
10. Applies Postgres migrations only.
11. Verifies the expected database schema.
12. Deploys the application Worker.
13. Deploys the scheduled maintenance Worker.
14. Calls the production health endpoint and fails if the smoke check is unhealthy.

The script deliberately does **not** run `supabase config push`, because broad hosted configuration synchronization can touch unrelated optional services. Hosted Auth settings are verified manually.

## First production configuration

Run `configure.cmd` or let `GO-LIVE.cmd` open it. Production requires:

- Supabase project URL, publishable key and server secret.
- 32-byte PII encryption key.
- matching and audit HMAC secrets.
- production application URL.
- legal operator/company name.
- privacy contact email.
- security disclosure email.
- accessibility contact email.
- optional DPO and registered-address details.
- mandatory MFA.
- Supabase project ref.
- Cloudflare credentials or interactive login.
- maintenance Cron secret.

Secrets remain in `.env.local` and Cloudflare secret storage. They are gitignored.

## Supabase Auth production settings

Verify these settings in the Supabase Dashboard before real users are invited:

```text
Site URL    = https://guestatlas.mosheschwartzberg.workers.dev
Redirect    = https://guestatlas.mosheschwartzberg.workers.dev/auth/confirm
Redirect    = https://guestatlas.mosheschwartzberg.workers.dev/auth/recovery
Confirm email = enabled
TOTP enrollment = enabled
TOTP verification = enabled
Secure password change = enabled
```

For the confirmation email template, the supported token-hash callback is:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Password recovery is initiated in the application and returns through `/auth/recovery`.

## Security and privacy boundaries

- No name-only network search.
- All supplied identifiers must resolve to the same guest.
- Property verification is required for network processing.
- Sensitive writes/searches require MFA.
- Search purpose is recorded before identity indexes are read.
- Guest contact data, raw evidence, and another property's local stay timeline are not part of ordinary cross-property disclosure.
- Guest access links are bearer links, expire after seven days, and new links rotate/revoke older active links for that property/guest.
- Staff invites expire after seven days and can be revoked.
- Serious or unverified adverse incidents require another authorized staff member to review them.
- Guest challenges place adverse records under review.
- Audit logs are append-only from application code.
- Substantive retention is reviewed rather than automatically destroyed.

## Legal launch status

The code provides technical controls; it cannot establish the legal status of the commercial network by itself. Before accepting real guest data, the operator must complete the controller/processor analysis, database registration/notification analysis, cross-border processing review, DPO analysis where applicable, hotel participation/data-sharing agreements, final legal wording, retention schedule, incident response plan, backup/restore testing, and accessibility QA.

See `LEGAL_AND_PRIVACY.md`, `SECURITY.md`, `DEPLOYMENT.md`, and `VALIDATION.md`.
