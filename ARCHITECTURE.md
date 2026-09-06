# GuestAtlas architecture

## Trust boundary

The web browser is an authentication client, not a database client. Auth sessions use `@supabase/ssr`; all business data operations go through request-specific Next.js server code. The Supabase secret key is server-only. Public application tables have RLS enabled and direct browser-role privileges revoked.

TOTP MFA is required by default. API routes independently enforce the current Authenticator Assurance Level, so privileged server routes cannot be reached just because a browser page was hidden.

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

## Incident workflow

Severity 1–2 can publish immediately. Severity 3–4 starts `pending_review`. Publication/rejection requires an owner/admin/manager different from the author. Evidence is stored in a private bucket using randomized object paths and encrypted original filenames.

## Guest rights and corrections

A manager can create an expiring random guest-portal token. Only the SHA-256 hash is stored. The guest can review published network material related to them and submit item-specific correction/dispute requests. Accepted changes create a `record_revisions` record before the active record is corrected/withdrawn/removed. Incident disputes force the incident into review while unresolved.

## Retention and audit

Search, reads, writes, moderation, evidence access and administrative actions are logged. Audit rows are append-only during normal operation. Retention candidates are queued for human/legal review rather than silently deleting substantive records. A 24-month audit pruning function is provided but intentionally not scheduled until counsel confirms the deployment's retention rule.
