# GuestAtlas

GuestAtlas is a complete multi-property hotel guest feedback and incident network. It is designed as **verified hospitality intelligence**, not a public people directory or automatic blacklist.

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
- Private incident evidence with MIME/size limits, hashes and audited signed downloads.
- Guest disclosure portal, correction/dispute workflow, automatic withholding of challenged records during review, and immutable revision history.
- Team invites, role changes, revocation and property switching.
- Append-only audit trail and daily search limits.
- Retention review queue plus a deliberately manual audit-log pruning function.
- Platform administration for hotel verification.
- Responsive desktop/mobile UI.
- Windows local setup and production deployment scripts.
- Docker web-tier deployment option.

## Security and privacy architecture

The browser uses Supabase only for authentication. Guest/business tables are accessed only by the Next.js server with the server-only Supabase secret key. Direct `anon` and `authenticated` database privileges are revoked from application tables and RLS is enabled as a second boundary.

Guest identity and guest-linked free text are encrypted with AES-256-GCM. Searchable exact-match identifiers are deterministic HMAC-SHA256 values using a separate secret. Encrypted fields include primary identity, reservation/room references, feedback summaries, incident titles/descriptions/references, evidence filenames, dispute text and responses.

Cross-property users do not receive another hotel's reservation timeline, contact details, or raw evidence. Search grants expire automatically. Every lookup requires a stated business purpose and is audited.

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

## Fast deployment

1. Create a Supabase project and copy its project URL, publishable key, server secret key and project ref.
2. Run `configure.cmd`. The wizard writes `.env.local` and automatically generates the AES encryption key plus matching, audit and cron secrets.
3. Set `NEXT_PUBLIC_APP_URL` to the intended production HTTPS origin in the wizard. Optional Supabase/Vercel access tokens make deployment non-interactive.
4. Run `deploy.cmd`. It installs the pinned dependencies, runs the source integrity check, validates secrets, typechecks, executes self-tests, runs a production build, pushes Supabase migrations, verifies the database/private bucket, links Vercel, synchronizes production environment variables and deploys production.
5. In Supabase Auth, set the Site URL to `NEXT_PUBLIC_APP_URL` and allow `NEXT_PUBLIC_APP_URL/auth/confirm`. For the **Confirm signup** email template, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so the SSR confirmation route can verify the token directly.
6. Sign up, enroll TOTP MFA and create the first property.
7. Run `node scripts/promote-admin.mjs your@email.com` for an email allowed by `PLATFORM_ADMIN_EMAILS`.
8. Open `/platform` and verify the first property. Cross-hotel guest processing remains blocked until verification.

`deploy.cmd` is fail-fast and will not continue past a failed typecheck, migration, schema verification, build, environment sync or deployment step.

## Local development

Run `setup-local.cmd`, fill `.env.local`, then run `npm run dev`.

## Production launch gate

Software cannot self-certify privacy/legal compliance. Before real guest data is accepted, have counsel review `LEGAL_AND_PRIVACY.md` for the actual operator/controller model, notices, contracts, database registration/notification obligations, retention, international transfers, guest rights, discrimination/defamation exposure and the countries where the network will operate.

See `SECURITY.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, and `VALIDATION.md` before launch.
