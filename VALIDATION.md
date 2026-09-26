# Validation status

GuestAtlas production validation is local/deployment-driven. GitHub Actions is not part of the release path.

## Automated checks before every `GO-LIVE.cmd` release

1. Lockfile-based dependency install.
2. High/critical production dependency advisory gate.
3. Production environment validation.
4. Source/deployment integrity scan.
5. TypeScript validation.
6. Scoring, reputation, encryption, normalized HMAC matching and token-helper self-tests.
7. OpenNext Cloudflare production build.
8. Wrangler application dry-run.
9. Wrangler maintenance Worker dry-run.
10. Supabase migration push to the linked existing project.
11. Database schema verification.
12. Application Worker deployment.
13. Maintenance Worker deployment.
14. Live production health smoke check.

The source checker also rejects the retired GitHub Actions workflow and old bootstrap Workers.dev discovery helpers, requires the launch-hardening migration and public legal/security surfaces, verifies Auth recovery/confirmation reference routes, checks mandatory production operator variables, verifies R2 and Observability configuration, and rejects Git operations in `GO-LIVE.cmd`.

## Manual production acceptance still required

Automated tests cannot prove the complete behavior of third-party hosted Auth, browser accessibility, network security controls, legal compliance, or backup recovery. Before real guest data:

- Test signup, confirmation, password reset, MFA enrollment and MFA verification with a real mailbox/device.
- Test staff invitation acceptance and revocation.
- Test hotel verification and immediate member suspension.
- Test guest exact-match searches and limits.
- Test cross-property disclosure minimization.
- Test multiple evidence uploads/downloads and unauthorized evidence denial.
- Test independent incident moderation.
- Test guest disclosure links, rotation, expiry, revocation and disputes.
- Test retention settings and queue generation.
- Review Cloudflare/Supabase security dashboards and logs.
- Test restore from a real database backup and document recovery objectives.
- Test keyboard-only and screen-reader-critical workflows.
- Review the final legal notices and participation agreements with qualified counsel.

Passing `GO-LIVE.cmd` means the checked local source built, migrated, deployed and passed its defined technical checks. It is not a legal-compliance certification or an independent penetration test.
