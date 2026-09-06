# GuestAtlas

GuestAtlas is a multi-property hotel guest feedback and incident network. It is designed as **verified hospitality intelligence**, not a public people directory or automatic blacklist.

## Production architecture

- **Cloudflare Workers** runs the full Next.js application, Server Components, Server Actions and API routes through OpenNext.
- **Cloudflare R2** stores new incident evidence in a private bucket named `guestatlas-evidence`.
- **Cloudflare Smart Placement** is enabled to reduce repeated upstream latency to database/auth services.
- **Cloudflare Observability** is enabled on both the application Worker and maintenance Worker.
- **Cloudflare Cron Triggers** run the separate `guestatlas-maintenance` Worker every day at 02:15 UTC to refresh retention candidates.
- **Supabase Postgres + Auth** remain the transactional database and identity provider behind the Cloudflare application backend.
- Evidence uploaded before the R2 migration remains readable through a legacy Supabase Storage fallback; all new evidence goes to R2.

The browser uses Supabase only for authentication. Guest/business tables are accessed by server code. The server-only Supabase secret key, encryption keys and matching secrets are never exposed to browser code.

## Included product surface

- Multi-property organizations with owner, admin, manager, reviewer and viewer roles.
- Property onboarding plus platform verification before cross-hotel network participation.
- Supabase Auth with mandatory TOTP MFA by default.
- Exact-match guest identity search using passport/national ID, email, phone, or full name + date of birth.
- Intersection matching when more than one identifier is supplied.
- Short-lived, audited cross-property access grants after a successful search.
- Guest creation and safe identity linking without automatically merging on email/phone alone.
- Local stay management.
- Six-dimension weighted hospitality scoring on a 0–100 display scale.
- Serious incident workflow kept separate from the hospitality score.
- Severity 3–4 two-person moderation where the author cannot self-approve.
- Private R2 incident evidence with MIME/size limits, hashes and authenticated streaming downloads.
- Guest disclosure portal, correction/dispute workflow, automatic withholding of challenged records during review, and immutable revision history.
- Team invites, role changes, revocation and property switching.
- Append-only audit trail and daily search limits.
- Retention review queue and Cloudflare-scheduled maintenance.
- Platform administration for hotel verification.
- Responsive desktop/mobile UI.
- Windows local setup and one-command production release.

## Security and privacy architecture

Guest identity and guest-linked free text are encrypted with AES-256-GCM. Searchable exact-match identifiers are deterministic HMAC-SHA256 values using a separate secret. Encrypted fields include primary identity, reservation/room references, feedback summaries, incident titles/descriptions/references, evidence filenames, dispute text and responses.

Cross-property users do not receive another hotel's reservation timeline, contact details, or raw evidence. Search grants expire automatically. Every lookup requires a stated business purpose and is audited.

New evidence objects are not public and are not exposed through signed R2 URLs. The authenticated `/api/evidence/:id` route performs MFA/role/source-property checks and streams the object through the Worker.

## Rating model

Six 1–5 dimensions are weighted:

- Cleanliness: 20%
- Property care: 20%
- Respect toward staff: 15%
- Noise/disturbance: 15%
- Payment conduct: 15%
- Policy compliance: 15%

The weighted 1–5 result is displayed as 0–100. Confidence is low for 1–2 published stays, medium for 3–5, and high for 6+.

Incidents do **not** secretly reduce the numerical score. They remain separate records with category, severity, evidence level, review state and dispute state.

## One-click Windows production release

1. Install Node.js 22+, npm and Git.
2. Create a Supabase project and copy its project URL, publishable key, server secret key and project ref.
3. Have a Cloudflare account. An API token/account ID are optional; without them Wrangler opens interactive login.
4. Run `configure.cmd` and enter the values. The wizard generates the encryption, matching, audit and cron secrets.
5. Run **`GO-LIVE.cmd`**.

`GO-LIVE.cmd` does all of the following in order:

1. Installs exact dependencies (`npm ci` when a lockfile exists, otherwise `npm install`).
2. Validates environment/source integrity.
3. Runs TypeScript and the cryptography/scoring self-tests.
4. Authenticates Wrangler.
5. Creates/verifies the private `guestatlas-evidence` R2 bucket.
6. Builds the complete OpenNext Cloudflare Worker.
7. Runs a Wrangler dry-run bundle validation.
8. Commits and pushes the exact validated source to GitHub `main`.
9. Links Supabase and applies migrations.
10. Verifies the Postgres schema.
11. Creates sanitized Worker secret bundles that exclude deployment credentials.
12. Deploys the GuestAtlas application Worker and optional custom domain.
13. Deploys the scheduled `guestatlas-maintenance` Worker.
14. Deletes temporary secret bundles.

`deploy.cmd` is kept as a compatibility alias and calls `GO-LIVE.cmd`.

## Supabase Auth after first deployment

Set the Supabase Auth Site URL to `NEXT_PUBLIC_APP_URL` and allow `NEXT_PUBLIC_APP_URL/auth/confirm`.

For the **Confirm signup** email template use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Then sign up, enroll TOTP MFA, create the first property, run `node scripts/promote-admin.mjs your@email.com` for an allowed `PLATFORM_ADMIN_EMAILS` address, and verify the first property from `/platform`.

## Local development

Run `setup-local.cmd`, then:

- `npm run dev` for the fast Next.js development loop.
- `npm run cf:preview` to test the production build in the Cloudflare Workers runtime.
- `GO-LIVE.cmd` for the full validated production release.

## Production launch gate

Software cannot self-certify privacy/legal compliance. Before real guest data is accepted, have counsel review `LEGAL_AND_PRIVACY.md` for the actual operator/controller model, notices, contracts, database registration/notification obligations, retention, international transfers, guest rights, discrimination/defamation exposure and the countries where the network will operate.

See `SECURITY.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, and `VALIDATION.md` before launch.
