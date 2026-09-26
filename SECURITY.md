# Security model and operations

GuestAtlas should be treated as a sensitive multi-tenant personal-information system.

## Identity and access

- Individual Supabase Auth identities only; shared accounts are prohibited.
- Email confirmation before normal account use.
- TOTP MFA required for protected hotel operations.
- Roles: owner, admin, manager, reviewer, viewer.
- Property membership is checked server-side on each protected workflow.
- Property verification gates network personal-data processing.
- Staff invitations expire after seven days and can be revoked.
- Role/status changes take effect from the database rather than being embedded permanently in a browser token.
- Current network terms/privacy acknowledgement is version-gated.

Password recovery uses a dedicated Auth callback and returns to a server-verified recovery session. Password reset messaging does not reveal whether an account exists.

Lost MFA factors require a controlled support/admin recovery process. Do not disable production MFA as a convenience workaround.

## Data boundary

The browser uses Supabase only for Auth/session handling. Business tables are accessed by server code with the server credential. Database tables have RLS enabled and anon/authenticated table privileges are revoked.

Core guest identity/free-text fields use application-level AES-256-GCM encryption. Exact-match identifiers use domain-separated HMAC values so plaintext search identifiers are not stored in the lookup index.

## Search abuse controls

- No name-only network search.
- Search requires document, email, phone, or full name + DOB.
- Multiple supplied identifiers must converge on the same guest.
- Verified property required.
- Business purpose required and audited before identity-index lookup.
- Per-user daily lookup limit.
- Result disclosure is minimized.
- Full cross-property access uses short-lived grants.

Cloudflare WAF/rate-limiting should also be configured at the account level where available and appropriate.

## Evidence

New incident evidence is stored only in private R2. Upload controls include:
- maximum 5 files;
- maximum 10 MB each;
- maximum 25 MB total;
- allow-listed MIME types;
- file-signature verification for PDF/JPEG/PNG/WebP and binary rejection for text;
- randomized storage keys;
- SHA-256 integrity metadata;
- authenticated/authorized download route;
- rollback if metadata persistence fails.

Never expose a public R2 bucket URL.

## Adverse-record integrity

Severity 3–4 incidents and all records identified as third-party/unverified reports are withheld until another authorized manager/admin reviews them. An author cannot approve their own queued incident.

Guest disputes place challenged adverse records under review. Resolution writes revision history transactionally.

## Browser security

Global headers include:
- Content-Security-Policy;
- Strict-Transport-Security;
- frame denial / frame-ancestors;
- no-sniff;
- referrer policy;
- permissions policy;
- COOP/CORP.

Private application pages are no-index/no-follow, and robots.txt disallows private surfaces.

## Secrets

Do not commit:
- Supabase server secret;
- PII encryption key;
- matching secret;
- audit HMAC secret;
- Cloudflare token;
- Supabase deployment token;
- Cron secret;
- Resend API key.

`GO-LIVE.cmd` builds an allow-listed temporary runtime environment bundle and deletes it after deployment.

## Logging and privacy

Audit logs keep hashes of IP/user-agent data rather than raw values. Avoid logging decrypted PII, bearer links, Auth tokens, file bytes, encryption keys, matching input, or secret-bearing request bodies.

Cloudflare/Supabase platform logs should be reviewed for accidental personal-data capture and assigned an approved retention period.

## Backup and recovery

Production launch requires a documented and tested database restore procedure. Record:
- backup source and cadence;
- restore credentials;
- recovery-point and recovery-time objectives;
- a periodic restore-test schedule;
- procedure for reconciling R2 evidence with restored database metadata.

R2 evidence should have a documented recovery/versioning strategy appropriate to the account plan and legal retention model. Do not claim recoverability until it has been tested.

## Incident response

At minimum:
1. contain compromised user/property credentials;
2. revoke affected invitations/disclosure links;
3. preserve relevant audit/platform logs;
4. rotate exposed secrets;
5. assess database and R2 access scope;
6. identify affected people/properties;
7. involve the privacy/security responsible person;
8. evaluate contractual/regulatory notification duties;
9. remediate and test;
10. document root cause and preventive changes.

Security reports are directed through the configured public security contact and `/.well-known/security.txt`.

## Release security gate

`GO-LIVE.cmd` fails on:
- missing/placeholder production contacts or secrets;
- disabled production MFA;
- high/critical production dependency advisories;
- source-integrity failures;
- TypeScript/self-test failure;
- Cloudflare build/dry-run failure;
- migration/schema failure;
- deployment failure;
- unhealthy live endpoint.

This is a strong engineering gate, not a penetration test. Arrange external security review before the system stores material real-world guest data.
