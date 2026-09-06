# Legal and privacy launch checklist

This file is a product/compliance engineering checklist, not legal advice.

## Israel

The product's core business model is specifically important under the Israeli Privacy Protection Law because it collects personal information for disclosure to participating third parties. Following Amendment 13, the Privacy Protection Authority states that a database whose primary purpose is collecting personal information for transfer to third parties as a business or for consideration, and which contains information about more than 10,000 people, is among the categories that remain subject to database registration. Databases not requiring registration still remain subject to the law's purpose limitation, confidentiality, security and data-subject-rights requirements.

The Israeli Privacy Protection Authority's information-security guidance also requires access privileges to be limited to what an employee needs for the job. Its security rules address identification/authentication, encrypted transmission, access logging and retention of certain technical/security records for 24 months. These requirements are why GuestAtlas uses individual accounts, roles, server-only data access, encrypted transport through hosted HTTPS, and audit logging.

Before launch, Israeli counsel should determine at minimum:
- Who is the database controller / בעל שליטה and whether GuestAtlas and/or participating hotels are joint/separate controllers.
- Whether the database must be registered, including the >10,000-person third-party-disclosure trigger.
- Whether any notification obligation applies to specially sensitive personal information at scale.
- Required database definition documents and security classification.
- Appointment requirements for privacy/security officers.
- The lawful basis and notices for collection from hotels and disclosure to other hotels.
- Right of access, correction, deletion/objection procedures and identity verification.
- Defamation, consumer-contract, discrimination and unfair-business-practice exposure from adverse guest reports.
- International hosting/transfer requirements for the selected Cloudflare Worker/R2 and Supabase regions and for participating hotels outside Israel.

## Product policy recommended for counsel to preserve

- No public or name-only guest directory.
- Purpose-limited, logged search.
- No protected-trait fields or ratings.
- No automated booking rejection.
- Factual, stay-specific contribution rules.
- Evidence status visible for incidents.
- Two-person approval for serious adverse records.
- Guest disclosure/correction/dispute mechanism, with challenged adverse records withheld from network consumers while reviewed.
- Expiry/retention review rather than permanent records by default.
- Strong consequences for malicious or knowingly false submissions.

## Retention

The database includes configurable hotel retention periods and a retention queue. It intentionally does not silently delete substantive guest/incident records on a generic timer, because the correct retention period depends on legal basis, claims limitation periods, disputes and jurisdiction. `queue_retention_candidates()` identifies records for review. The Cloudflare maintenance Worker refreshes candidates daily; it does not automatically erase substantive guest records. `prune_old_audit_logs()` implements a 24-month cutoff for technical audit records but is not auto-scheduled; enable it only after counsel confirms that this fits the deployed database's obligations.

## Infrastructure/privacy review items

- Confirm the selected Cloudflare and Supabase account/region configuration meets applicable transfer and data-residency requirements.
- Keep the R2 evidence bucket private and do not expose a public/custom bucket domain.
- Review Cloudflare and Supabase subprocessors, contractual terms and data-processing agreements for the actual commercial launch.
- Define retention/deletion procedures for R2 objects together with their corresponding database evidence records.
- Define incident-response procedures that cover both Cloudflare and Supabase access credentials, logs and backups.

## Source links reviewed during implementation

- Israel Privacy Protection Authority: database registration service and Amendment 13 registration categories.
- Israel Privacy Protection Authority: Information Security Regulations implementation guide, including least-privilege access, identification/authentication, communications security and 24-month technical-data retention guidance.

Re-check these sources immediately before launch because privacy law, regulator guidance and platform obligations can change.
