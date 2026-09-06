# GuestAtlas architecture

## Runtime topology

The full Next.js application runs on **Cloudflare Workers** through OpenNext. This includes React Server Components, Server Actions and API route handlers. Cloudflare Static Assets serves build assets, Smart Placement is enabled for upstream-heavy requests, and Worker Observability is enabled.

A separate `guestatlas-maintenance` Worker owns the daily retention Cron Trigger. It calls the application's authenticated retention endpoint with `CRON_SECRET`; it has no guest/database credentials of its own.

Supabase remains the transactional Postgres/Auth layer behind the Cloudflare application server. New binary evidence is stored in private Cloudflare R2 using an in-process Worker binding rather than REST credentials.

## Trust boundary

The web browser is an authentication client, not a business-database client. Auth sessions use `@supabase/ssr`; business data operations go through request-specific Next.js server code executing inside Cloudflare Workers. The Supabase secret key is server-only. Public application tables have RLS enabled and direct browser-role privileges revoked.

TOTP MFA is required by default. API routes independently enforce the current Authenticator Assurance Level, so privileged server routes cannot be reached just because a browser page was hidden.

Cloudflare deployment credentials are never uploaded to the Worker. `scripts/build-cloudflare-secrets.mjs` constructs allow-listed runtime secret bundles and omits `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `SUPABASE_ACCESS_TOKEN`.

## Tenant model

A user can belong to multiple hotels. Membership roles are owner, admin, manager, reviewer and viewer. Hotel selection is explicit and membership status is rechecked from the database. New properties start `pending`; guest-network processing/search is blocked until a platform administrator marks the property `verified`.

## Identity and matching

Encrypted guest identity lives in `guests`. Exact-match tokens live in `guest_identifiers` as keyed HMACs. Supported searches are document, email, phone, or name + DOB. Name-only search is intentionally disabled.

When multiple identifiers are supplied they must intersect on the same guest. Document matching can safely merge an existing record by itself. Email or phone never auto-merge a person unless the contact identifier also agrees with exact name + DOB.

A network match creates a short-lived `guest_access_grants` row for the requesting user/property. Possession of a leaked guest UUID alone does not grant cross-property access.

## Cross-property disclosure

The network provides the minimum operational intelligence needed for reputation review. Another hotel can see the guest identity needed to confirm the matched person, aggregate score, published feedback and published/under-review incident intelligence. It does not receive the originating hotel's reservation references, room references, local stay timeline, guest contact details or raw evidence.

The local property retains its own operational stay/contact details. Raw evidence is limited to source-property owner/admin/manager/reviewer roles and platform administrators.

## Reputation model

Published ordinary stay feedback contains six 1–5 dimensions. The score uses a transparent weighted average: cleanliness 20%, property care 20%, staff respect 15%, noise 15%, payment 15%, policy compliance 15%. The weighted result is multiplied by 20 for the 0–100 display.

Serious incidents never become hidden numerical penalties. They remain separate records.

## Incident evidence

New incident evidence uses R2 keys prefixed with `r2/`. Objects are written through the `EVIDENCE_BUCKET` binding with randomized paths, content-type metadata and SHA-256 metadata. The original filename remains encrypted in Postgres.

The R2 bucket is private. There is no signed/public R2 evidence URL. `/api/evidence/:id` authenticates the user, enforces MFA and hotel role/source-property rules, then streams the object with `Cache-Control: private, no-store`.

Legacy evidence paths without the `r2/` prefix are read from Supabase Storage through the same authenticated route so the infrastructure migration does not break existing records.

## Guest rights and corrections

A manager can create an expiring random guest-portal token. Only the SHA-256 hash is stored. The guest can review published network material related to them and submit item-specific correction/dispute requests. Accepted changes create a `record_revisions` row before the active record is corrected/withdrawn/removed. Incident disputes force the incident into review while unresolved.

## Retention and audit

Search, reads, writes, moderation, evidence access and administrative actions are logged. On Cloudflare, `CF-Connecting-IP` is preferred for the source address and is immediately HMAC-hashed; the raw address is not retained in the application audit row.

Audit rows are append-only during normal operation. Retention candidates are queued for human/legal review rather than silently deleting substantive records. The maintenance Worker schedules candidate refresh daily. A 24-month audit pruning function remains deliberately unscheduled until counsel confirms the deployment's retention rule.
