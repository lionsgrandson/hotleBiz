# GuestAtlas

GuestAtlas is a multi-property hotel guest feedback and incident network built as **verified hospitality intelligence**, not a public people directory, hidden blacklist, or automatic booking-decision engine.

## Included product surface

- Multi-property workspaces with owner, admin, manager, reviewer and viewer roles.
- Property onboarding plus platform verification before cross-property network participation.
- Supabase Auth with mandatory TOTP MFA by default.
- Exact-match guest lookup using passport/national ID or full name + date of birth; email/phone can corroborate identity but do not independently authorize an automatic merge.
- Intersection matching when multiple identifiers are supplied, ambiguity refusal, purpose capture and daily search limits.
- 15-minute audited cross-property access grants after a successful exact match.
- Guest identity creation/linking with document-type domain separation and conflict detection.
- Permanent property/guest relationships created only by a legitimate non-cancelled stay, not by merely looking up or creating an identity record.
- Stay management plus six-dimension weighted hospitality scoring on a 0–100 display scale.
- Serious incidents kept separate from the numerical hospitality score.
- Severity 3–4 two-person moderation where the author cannot self-approve.
- Private incident evidence with MIME/signature/size validation, hashes, randomized paths and audited signed downloads.
- Guest disclosure portal, correction/dispute workflow, automatic withholding of challenged records during review and immutable revision history.
- Team invites, role changes, revocation and property switching.
- Append-only audit trail, retention review queue and platform administration.
- Suspension/rejection controls that revoke outstanding network search grants and guest-portal links while preserving local compliance workflows.
- Secret staff/guest links displayed through short-lived HttpOnly flash cookies instead of redirect query strings; search business-purpose text is also kept out of guest-profile URLs.
- Responsive desktop/mobile UI, Windows setup/deployment scripts, Docker option and GitHub Actions CI.

## Security and privacy architecture

The browser uses Supabase only for authentication. Guest/business tables are accessed through request-specific Next.js server code using the server-only Supabase secret key. Direct `anon` and `authenticated` privileges are revoked from application tables and RLS remains enabled as a second boundary.

Guest identity and guest-linked free text are encrypted with AES-256-GCM. Searchable identifiers use deterministic HMAC-SHA256 with a separate secret and distinct namespaces for passport, national ID, email, phone and name+DOB. Encrypted fields include primary identity, reservation/room references, feedback summaries, incident titles/descriptions/references, evidence filenames, dispute text and responses.

A successful lookup proves the match but does not reveal another property's contact identifiers or operational timeline. Cross-property consumers receive only the minimum published reputation/incident intelligence needed for the verified match. Raw evidence remains source-property/platform only. Every cross-property lookup requires a stated business purpose and is audited.

## Guest-access lifecycle

1. A verified active property performs an exact-match search or creates/links an identity record.
2. The user receives a short, audited access grant to review the matched profile and record the intended stay.
3. The property becomes permanently linked to that guest only when a non-cancelled stay is recorded.
4. Future local access is based on that stay-backed relationship. A leaked guest UUID or an old search URL is not sufficient.
5. Suspending/rejecting a property immediately revokes its active cross-property search grants and outstanding guest-portal links. Local disputes, audit review, retention and historical property records remain available for compliance handling.

## Rating model

Six 1–5 dimensions are weighted:

- Cleanliness: 20%
- Property care: 20%
- Respect toward staff: 15%
- Noise/disturbance: 15%
- Payment conduct: 15%
- Policy compliance: 15%

The weighted 1–5 result is displayed as 0–100. Confidence is low for 1–2 published stays, medium for 3–5 and high for 6+.

Incidents do **not** secretly reduce the numerical score. They remain separate records with category, severity, evidence level, review state and dispute state. Challenged feedback/incidents are withheld from other properties during review; challenged feedback is also excluded from the network score until resolved.

## Fast deployment

1. Create a Supabase project and copy its project URL, publishable key, server secret key and project ref.
2. Run `configure.cmd`. The wizard writes `.env.local` and generates the AES encryption key plus matching, audit and cron secrets.
3. Set `NEXT_PUBLIC_APP_URL` to the intended production HTTPS origin. Optional Supabase/Vercel access tokens make deployment non-interactive.
4. Run `deploy.cmd`. It installs dependencies, validates configuration, typechecks, runs self-tests and a production build **before** applying the database migration, then verifies the schema/private bucket, syncs Vercel Production environment variables and deploys.
5. In Supabase Auth, set the Site URL to `NEXT_PUBLIC_APP_URL` and allow `NEXT_PUBLIC_APP_URL/auth/confirm`.
6. Sign up, enroll TOTP MFA and create the first property.
7. Run `node scripts/promote-admin.mjs your@email.com` for an address allowed by `PLATFORM_ADMIN_EMAILS`.
8. Open `/platform` and verify the first property.

`deploy.cmd` is fail-fast. Do not bypass a failed environment check, typecheck, self-test, build, migration, schema verification or deployment step.

## Continuous validation

`.github/workflows/ci.yml` runs on `main` and pull requests using Node 22. It performs a fresh dependency install, environment validation, TypeScript check, cryptography/scoring self-test and production Next.js build.

## Local development

Run `setup-local.cmd`, fill `.env.local`, then run `npm run dev`.

## Production launch gate

Software cannot self-certify privacy/legal compliance. Before accepting real guest data, have counsel review `LEGAL_AND_PRIVACY.md` for the actual controller/operator model, notices/contracts, database registration/notification obligations, retention, transfers, guest rights, discrimination/defamation exposure and every jurisdiction where the network will operate.

See `SECURITY.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `RELEASE.md` and `VALIDATION.md` before launch.