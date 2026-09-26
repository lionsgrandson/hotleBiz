# GuestAtlas 1.2 production hardening scope

## Product changes

- Public launch site instead of redirecting the root URL into the private dashboard.
- Production Privacy Notice, Network Terms, Acceptable Use Policy, Cookie Notice, Accessibility Statement, Security page and security.txt.
- Explicit separation between public pages and no-index private application surfaces.
- Staff password-reset/recovery workflow.
- Stronger staff signup with 12-character minimum password and explicit versioned terms/privacy acknowledgement.
- Current-policy re-acknowledgement gate for existing staff.
- Stronger property onboarding attestations.
- Property privacy-contact and retention-governance settings.
- Revocable, expiring staff invitations.
- Seven-day rotating/revocable guest disclosure links.
- Multiple incident evidence uploads: maximum five files, 10 MB each, 25 MB total, with MIME/signature validation.
- Independent review for any severity 3–4 incident and any incident marked as a report that was not independently verified.
- CSP, HSTS and expanded browser security headers.
- Public robots/sitemap plus no-index controls for private surfaces.
- Production health responses marked no-store.

## Infrastructure and deployment

- Cloudflare Workers + OpenNext.
- Private Cloudflare R2 evidence.
- Cloudflare Observability.
- Separate maintenance Cron Worker.
- Supabase Auth + PostgreSQL.
- Direct `GO-LIVE.cmd` deployment from the local source folder.
- No GitHub Actions workflow and no Git pull/push/commit dependency in the production deploy script.
- Postgres migrations only; no broad `supabase config push`.
- Live health smoke test after deployment.

## Database migration

`202609260003_launch_hardening.sql` adds staff policy-acknowledgement fields, property policy-version fields, revocable staff invitations and operational indexes.

## Release boundary

This release is technically hardened for public deployment, but real guest-data launch remains conditional on final legal/controller analysis, required registration/notification decisions, applicable DPO analysis, data-sharing/processing agreements, cross-border hosting review, backup/restore validation, security review and accessibility QA.
