# GuestAtlas 1.0 release scope

This repository contains the complete initial GuestAtlas network product surface, not a mockup or UI-only prototype.

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
- Next.js web/API tier.
- Supabase Auth, PostgreSQL and private Storage migration.
- Application-layer AES-256-GCM encryption and HMAC exact matching.
- Vercel production deployment and cron configuration.
- `configure.cmd`, `setup-local.cmd` and fail-fast `deploy.cmd` for Windows.
- Dockerfile for alternate web-tier hosting.

## Launch responsibility
The code implements strong technical and product safeguards, but a real shared guest-information network still requires jurisdiction-specific counsel, operational security review, staging/integration testing, and production monitoring before accepting real guest data. See `LEGAL_AND_PRIVACY.md`, `SECURITY.md`, `DEPLOYMENT.md` and `VALIDATION.md`.
