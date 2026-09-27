import Link from 'next/link'

export const dynamic = 'force-static'

export default function GuestRightsPage() {
  const privacyEmail = process.env.PRIVACY_CONTACT_EMAIL || 'privacy@example.com'
  return (
    <main className="legal" style={{ maxWidth: 920 }}>
      <span className="eyebrow">Guest rights</span>
      <h1>Access, review, challenge, or correct your GuestAtlas record</h1>
      <p>GuestAtlas separates hotel staff access from guest access. A participating property can issue a private guest portal link only after verifying the recipient is connected to the record.</p>

      <section className="card panel section">
        <h2>Private guest portal</h2>
        <p>The portal shows published feedback and incidents associated with your record. You can challenge an individual item or submit a broader privacy request for access/export, rectification, erasure, restriction, objection, or another data-rights matter.</p>
        <p>Submitting a request does not automatically delete data. Requests are reviewed so legal holds, accuracy disputes, third-party rights and applicable legal requirements can be handled correctly.</p>
      </section>

      <section className="card panel section">
        <h2>How to obtain access</h2>
        <p>Contact the participating property connected to your stay and ask for a GuestAtlas access link. The property must verify identity before issuing it. If you cannot reach the property, contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
      </section>

      <section className="card panel section">
        <h2>Human review</h2>
        <p>GuestAtlas is not intended to make a fully automated booking denial. Participating properties remain responsible for checking identity, record quality, dispute status, age of the information and context before making a material decision.</p>
      </section>

      <section className="card panel section">
        <h2>Complaints and escalation</h2>
        <p>If a factual dispute is rejected, you may ask the contributing property for its rationale and use the privacy contact above for further escalation. Regulatory or court rights depend on the law that applies to you and to the relevant controller.</p>
      </section>

      <p><Link href="/privacy">Privacy notice</Link> · <Link href="/terms">Network rules</Link> · <Link href="/login">Hotel staff sign in</Link></p>
    </main>
  )
}
