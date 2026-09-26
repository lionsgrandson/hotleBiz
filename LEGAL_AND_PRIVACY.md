# Legal, privacy and accessibility launch checklist

This is product/compliance engineering documentation, not a legal opinion. The technical system can enforce controls; it cannot decide the operator's legal status or replace jurisdiction-specific counsel.

## Israel — current launch issues

GuestAtlas is a shared personal-information network. That is materially different from an ordinary hotel CRM.

Under Amendment 13 to the Israeli Privacy Protection Law, the former general database-registration duty was narrowed. However, section 8A keeps registration for specified databases, including a database whose main purpose is collecting personal information for lawful disclosure to others as a business or for consideration when it contains personal information about more than 10,000 people.

A separate notice regime applies to a non-registration database that contains specially sensitive personal information about more than 100,000 people.

Amendment 13 has also introduced/expanded DPO appointment duties for specified organizations. The Privacy Protection Authority published final DPO guidance in July 2026. The operator must assess the actual business, scale, processing and organizational structure against that guidance.

The Israeli cross-border transfer regulations must be assessed for the selected Cloudflare/Supabase regions and for participating properties outside Israel.

Before real-data launch, Israeli counsel should determine and document:

- the database controller / בעל שליטה structure;
- whether GuestAtlas and participating properties are separate, joint, or processor/controller parties for each workflow;
- whether and when section 8A registration is required, including the >10,000 third-party-disclosure threshold;
- whether the >100,000 specially-sensitive-information notice duty could apply;
- DPO appointment duties;
- database definition/security-classification documents;
- notices and lawful authority/basis for collection, hotel contribution and inter-hotel disclosure;
- guest access/correction/deletion/objection procedures and identity verification;
- defamation exposure and review standards for adverse guest allegations;
- anti-discrimination requirements and prohibited-proxy policy;
- data-processing/data-sharing agreements with participating hotels;
- Cloudflare/Supabase processor terms, subprocessors and international-transfer safeguards;
- retention periods for identity, stay feedback, incidents, evidence, disputes and security logs;
- breach-response and regulator-notification duties;
- contract/consumer-law disclosures, limitations and governing-law language.

## DPO / privacy governance

The production environment supports public privacy and DPO contact fields. Do not populate a DPO contact merely for appearances. Determine whether appointment is legally required and whether the person has the required independence, expertise and organizational access.

Operationally, a privacy owner should be responsible for:
- privacy notices and policy versioning;
- guest-rights requests;
- hotel participation/privacy onboarding;
- retention decisions;
- vendor/subprocessor reviews;
- incident/breach response;
- regulator contact;
- periodic access and audit review.

## Accessibility

Israeli internet-service accessibility rules reference Israeli Standard 5568 and level AA where applicable. GuestAtlas includes a public accessibility statement, skip link, visible focus behavior, semantic labels, keyboard-oriented controls, and responsive layouts, but launch still requires a real accessibility QA pass. Uploaded third-party evidence/documents need their own handling.

## Product safeguards that should remain

- no public guest directory;
- no name-only network lookup;
- exact-match identity requirements;
- logged business purpose;
- role and property verification;
- mandatory staff MFA;
- no protected-trait rating fields;
- no automatic booking rejection;
- factual contribution rules;
- evidence status;
- independent review for serious or unverified adverse incidents;
- guest disclosure/correction/dispute workflow;
- dispute withholding;
- short-lived/revocable disclosure links;
- revocable staff access;
- configurable retention review instead of indefinite default retention;
- append-only application audit history.

## Retention

Property settings control review periods within bounded ranges:
- feedback: 6–120 months;
- incidents: 12–180 months;
- guest identity: 12–180 months.

Crossing a review date queues a record; it does not automatically delete substantive data. Destructive processing should be implemented only against an approved retention policy that handles related R2 evidence, disputes, claims holds and legal obligations consistently.

Technical/audit-log retention also requires legal/security review. The existing controlled prune function is not scheduled automatically.

## Cross-border processing

Do not assume that using a major cloud provider alone satisfies Israeli transfer rules. The operator should record:
- where Supabase database/Auth are hosted;
- where Cloudflare Workers/R2 may process/store data;
- the legal transfer basis;
- contractual undertakings;
- subprocessor chain;
- participating-hotel locations;
- any localization or transfer limitations.

## Pre-launch evidence pack

Keep a dated launch file containing:
- final public policies;
- signed hotel participation/data-processing terms;
- registration/notification decision memo;
- DPO decision memo;
- system/data-flow diagram;
- vendor/region list;
- security risk assessment;
- access-role matrix;
- retention schedule;
- incident-response plan;
- backup/restore test;
- accessibility QA results;
- production acceptance test results.

## Authoritative sources to re-check at launch

Use the current Israel Privacy Protection Authority / Ministry of Justice materials for:
- Amendment 13 and database registration;
- notice duty for specially sensitive information at scale;
- DPO guidance;
- Privacy Protection (Data Security) Regulations;
- transfer of information outside Israel;
- applicable accessibility regulations and Israeli Standard 5568.

Regulator guidance and thresholds can change; re-check immediately before commercial launch and again as the network scales.
