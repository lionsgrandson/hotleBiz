# GuestAtlas 1.1 Cloudflare release scope

This repository contains the complete GuestAtlas network product surface plus its Cloudflare production runtime.

## Product

- Multi-hotel workspaces, hotel verification, staff roles, invitations and revocation.
- Mandatory staff MFA by default.
- Exact-match guest identity network with audited, short-lived access grants.
- Local stay history and six-factor weighted hospitality feedback.
- Serious incident documentation, evidence, two-person moderation and publication controls.
- Guest disclosure, dispute/correction, temporary network withholding and transactional revision workflow.
- Private evidence downloads, audit log, retention queue and platform administration.
- Responsive authenticated dashboard plus legal/privacy/terms surfaces.

## Infrastructure

- Full Next.js web/API/server tier on Cloudflare Workers through OpenNext.
- Private Cloudflare R2 for all new incident evidence.
- Authenticated streaming evidence route with legacy Supabase Storage compatibility.
- Cloudflare Smart Placement and Worker Observability.
- Separate `guestatlas-maintenance` Cloudflare Worker with daily Cron Trigger.
- Supabase Auth and PostgreSQL as the transactional identity/data layer behind the Worker.
- Application-layer AES-256-GCM encryption and HMAC exact matching.
- `configure.cmd`, `setup-local.cmd`, `GO-LIVE.cmd` and compatibility `deploy.cmd` for Windows.
- `GO-LIVE.cmd` installs, validates, builds, dry-runs, commits/pushes, migrates and deploys the complete release.
- Cloudflare and application runtime secrets are separated from deployment credentials.

## Launch responsibility

The code implements strong technical and product safeguards, but a real shared guest-information network still requires jurisdiction-specific counsel, operational security review, staging/integration testing, backup/restore testing and production monitoring before accepting real guest data. See `LEGAL_AND_PRIVACY.md`, `SECURITY.md`, `DEPLOYMENT.md` and `VALIDATION.md`.
