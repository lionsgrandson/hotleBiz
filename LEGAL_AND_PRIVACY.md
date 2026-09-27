# Legal and privacy launch checklist

This is a compliance-engineering checklist, not legal advice. Legal obligations must be confirmed for the actual operator, hotels, countries, data volumes and contracts immediately before launch.

## Israel - Privacy Protection Law / Amendment 13

Amendment 13 entered into force in August 2025. Current Privacy Protection Authority guidance materially changed the database-registration regime and introduced/expanded compliance duties.

Before real guest data is accepted, Israeli counsel should determine:

- the בעל שליטה / database-controller allocation between GuestAtlas and each participating hotel;
- whether the database falls into a category that still requires registration, including databases whose main purpose is collecting personal information for transfer to others as an occupation/for consideration at the relevant scale;
- whether notification to the Privacy Protection Authority applies to a database containing special-sensitive information about more than 100,000 people;
- whether the operator or any participating organization must appoint a Data Protection Officer;
- the database definition/security documentation and security-level requirements;
- lawful bases/purposes and required notices;
- access, correction, objection/erasure and complaint handling;
- cross-border transfer and subprocessor requirements;
- security incident and regulator-notification procedures;
- defamation, discrimination, consumer-law and unfair-business-practice exposure from adverse reports.

GuestAtlas records a property compliance profile, DPO-review status and privacy request workflow but intentionally does not decide whether any of those legal obligations apply.

## EU/EEA and UK applicability

Where GDPR or UK GDPR applies, the operating model should be reviewed for:

- access, rectification, erasure and restriction rights;
- objection and portability/export rights where applicable;
- lawful basis and transparency;
- processor/controller/joint-controller contracts;
- international transfer safeguards;
- DPO/representative obligations where applicable;
- solely automated decision-making safeguards.

GuestAtlas deliberately does not provide a fully automated booking-denial function. A material decision should involve meaningful human review and consideration of identity match quality, evidentiary support, recency and dispute status.

## Data minimization and prohibited content

The system/policy should not be used to store or infer protected/sensitive characteristics unrelated to the hospitality purpose, including race/ethnicity, religion, political opinion, trade-union membership, sexual orientation/sex life, health/disability information, genetic/biometric profiling or irrelevant family details.

Incident narratives should be factual, stay-specific and proportionate. They should distinguish direct observation from third-party reports and should not contain speculative character judgments.

## Guest rights

Implemented technical paths include:

- verified private guest access links;
- self-service visible-data JSON export;
- record-specific challenge/correction requests;
- broader access/export, rectification, erasure, restriction and objection requests;
- hotel-side response history;
- challenged adverse records being withheld during review where the existing workflow applies;
- access-link revocation and audit logging.

A rejected dispute should have an escalation path outside the original author. Define the escalation owner before launch.

## Retention and deletion

Retention candidates are queued rather than silently erased. Automatic destructive erasure is intentionally not enabled because legal holds, limitation periods, ongoing disputes, evidence preservation and controller-specific obligations can alter the correct action.

Counsel/operator must approve:

- retention periods by record type;
- evidence-object retention;
- pseudonymization vs deletion;
- dispute/legal-hold exceptions;
- backup retention and deletion propagation.

## Infrastructure and subprocessors

Document and contractually review the actual production use of:

- Cloudflare Workers/R2/observability;
- Supabase Postgres/Auth;
- any transactional email provider;
- any future analytics/monitoring provider that receives personal data.

Keep the R2 evidence bucket private. Do not create a public bucket domain for guest evidence.

## Launch documents to finalize

- privacy notice;
- hotel/network participation agreement;
- data processing/joint-controller terms as applicable;
- acceptable-use and prohibited-content policy;
- guest identity-verification procedure;
- dispute/escalation procedure;
- retention/deletion schedule;
- information-security and incident-response plan;
- breach/regulator notification procedure;
- law-enforcement/legal-request procedure;
- staff access/offboarding procedure;
- subprocessor and transfer register.

Re-check current regulator guidance immediately before launch.
