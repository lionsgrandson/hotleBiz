export default function Privacy(){
  const privacyEmail=process.env.PRIVACY_CONTACT_EMAIL||'privacy@example.com'
  const operator=process.env.OPERATOR_LEGAL_NAME||'GuestAtlas operator'
  return <main className="legal">
    <span className="eyebrow">Production privacy notice framework · counsel review required</span>
    <h1>Privacy and data governance</h1>
    <p><strong>Operator:</strong> {operator}. <strong>Privacy contact:</strong> <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
    <p>GuestAtlas is a controlled business-to-business hospitality information network. Participating properties may act as controllers, joint controllers, recipients, or processors depending on the final contractual model and jurisdiction. The operator must finalize that allocation before accepting real guest data.</p>

    <h2>Information handled</h2>
    <p>The service can process verified identity details, contact details, stay references, structured hospitality feedback, documented incidents, supporting evidence, disputes, access logs and privacy requests. Searchable identifiers are HMAC-matched; sensitive free text and identity fields are encrypted at application level.</p>

    <h2>Purpose limitation</h2>
    <p>Use is limited to legitimate hospitality safety, property protection, payment administration, service-quality and related guest-relationship purposes. General people-search, public blacklisting, stalking, employment screening and unrelated profiling are prohibited.</p>

    <h2>Prohibited content</h2>
    <p>Do not record or use race or ethnicity, religion, political opinions, trade-union membership, sexual orientation or sex life, health/disability information, genetic or biometric profiling, irrelevant family details, or speculative character judgments. Country/nationality data may be used only when genuinely necessary for identity/legal operations, never as a rating factor.</p>

    <h2>Human decision-making</h2>
    <p>GuestAtlas does not provide a fully automated booking-denial function. Scores and incidents are decision-support information only. Properties must use meaningful human review and consider disputes, stale information, mismatches and evidentiary quality.</p>

    <h2>Guest rights</h2>
    <p>Verified guests can receive a private portal link, inspect visible network records, challenge individual records, and submit broader requests for access/export, rectification, erasure, restriction, objection or other privacy matters. Destructive actions are not automatic.</p>

    <h2>Retention and security</h2>
    <p>Retention is configurable by participating property and feeds a review queue. GuestAtlas uses MFA, role-based access, private evidence storage, encryption, audit logging, short-lived cross-property grants and security headers. Exact legal retention periods and deletion rules require operator/counsel approval.</p>

    <h2>International transfers and subprocessors</h2>
    <p>The production stack uses Cloudflare and Supabase and may optionally use an email delivery provider. The operator must document subprocessors, data locations and any required cross-border transfer safeguards before launch.</p>

    <h2>Regulatory status</h2>
    <p>Database registration/notification, DPO appointment, GDPR/UK GDPR applicability and other filings depend on the actual operator, scale, data categories, jurisdictions and contracts. Software cannot make those legal determinations.</p>
  </main>
}
