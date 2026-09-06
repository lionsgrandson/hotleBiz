import Link from 'next/link'

export const dynamic = 'force-static'

export default function GuestRightsPage() {
  return (
    <main className="legal" style={{ maxWidth: 920 }}>
      <span className="eyebrow">Guest rights</span>
      <h1>Review, challenge, or correct your GuestAtlas record</h1>
      <p>
        Hotel staff accounts and guest access are separate. Guests do not need a hotel staff account.
        A participating property can issue a private GuestAtlas access link after verifying that the
        recipient is the guest connected to the record.
      </p>

      <section className="card panel section">
        <h2>If you already received a GuestAtlas access link</h2>
        <p>
          Open the secure link sent by the property. Your private guest portal shows the feedback and
          published incidents connected to your record. Each item includes a challenge / correction
          request form that you can submit directly.
        </p>
        <p>
          When a challenge is submitted, the record is marked for review and the responsible property
          can accept, correct, withdraw, or reject the challenge through its dispute workflow.
        </p>
      </section>

      <section className="card panel section">
        <h2>If you need access</h2>
        <p>
          Contact the property that recorded your stay and ask for a GuestAtlas guest access link. The
          property must verify your identity before issuing access. This prevents someone else from
          searching for or challenging a guest record without authorization.
        </p>
      </section>

      <section className="card panel section">
        <h2>What you can challenge</h2>
        <p>
          You can submit a challenge or correction request against an individual stay feedback record
          or a published incident. The request is stored as a formal dispute with a review history.
        </p>
      </section>

      <p><Link href="/login">Hotel staff sign in</Link></p>
    </main>
  )
}
