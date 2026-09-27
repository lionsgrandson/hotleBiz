# GuestAtlas production-readiness register

This document separates implemented controls from operator/legal items that software cannot decide.

## Implemented product controls

- Supabase Auth with mandatory TOTP MFA for hotel operations.
- Per-property RBAC: owner, admin, manager, reviewer, viewer.
- Platform-admin separation and hotel verification.
- Application-level AES-256-GCM encryption for guest identity and narrative PII.
- HMAC-based exact matching instead of searchable plaintext identifiers.
- No public guest directory and short-lived cross-property lookup grants.
- Purpose capture and audit logging for guest lookups and record access.
- Structured feedback dimensions with incidents kept separate from the numeric score.
- Two-person review for serious incidents.
- Private Cloudflare R2 evidence with file type, signature, size and hash checks.
- Guest portal with record-level disputes/corrections.
- Broader data-rights request workflow: access, export, rectification, erasure, restriction, objection and other.
- No automatic booking denial or automatic destructive erasure.
- Retention review queue.
- Password recovery.
- Security headers, no-index/no-store treatment for private guest portal routes.
- Local Windows production deployment through UPLOAD-PRODUCTION.cmd; GitHub Actions are not required.

## Mandatory operator decisions before real guest data

1. Identify the legal operator/controller(s) and processor relationships between GuestAtlas and participating hotels.
2. Have qualified counsel approve the lawful basis for each processing purpose and each launch jurisdiction.
3. Determine whether Israel Privacy Protection Law Amendment 13 requires:
   - database registration,
   - notification to the Privacy Protection Authority,
   - appointment of a DPO,
   - additional database/security documentation.
4. Determine GDPR/UK GDPR applicability, international transfer mechanism, representative/DPO obligations, and data-subject response procedures where relevant.
5. Finalize privacy notice, network terms, hotel participation agreement/DPA, acceptable-use policy, retention schedule, incident-response plan and law-enforcement request process.
6. Define a documented identity-verification procedure before issuing guest portal links.
7. Define evidence standards for allegations, defamation review, and escalation for suspected criminal conduct.
8. Prohibit protected/sensitive characteristics and proxy discrimination in policy and staff training.
9. Require a meaningful human decision before any material booking restriction; do not use GuestAtlas as a fully automated blacklist.
10. Define appeal escalation when a contributing hotel rejects a guest challenge.
11. Define deletion/pseudonymization behavior after retention review; current software intentionally does not auto-delete disputed or legally relevant records.
12. Confirm data residency, subprocessors, transfer safeguards and contractual terms for Cloudflare, Supabase and any email provider.
13. Set PRIVACY_CONTACT_EMAIL, SUPPORT_EMAIL and OPERATOR_LEGAL_NAME in production configuration.
14. Configure Supabase production Auth URL/redirects, email confirmation, TOTP enrollment/verification and appropriate session limits.
15. Configure Cloudflare DNS/custom domain when moving off workers.dev, TLS, WAF/rate-limiting rules where available, and log retention.
16. Create and test backups/restores for Postgres and evidence objects. A backup that has never been restored is not a verified backup.
17. Run security testing before launch: authorization/BOLA, CSRF, SSRF, stored XSS, upload bypass, auth recovery, MFA bypass, token leakage, enumeration, concurrency and abuse tests.
18. Run accessibility testing for keyboard, focus, contrast, form labels, error handling and screen readers.
19. Run load tests around search, guest pages, evidence upload/download and dispute submission.
20. Establish support, abuse, breach and privacy-response ownership with on-call contacts.

## Launch gate

Do not mark the service legally "compliant" from a software test. The technical system can enforce product controls, but legal applicability and filings depend on the actual operator, contracts, data volumes, categories of data, countries served and business model.
