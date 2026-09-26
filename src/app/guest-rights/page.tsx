import type { Metadata } from 'next'
import Link from 'next/link'
import { mailto, publicOperator } from '@/lib/public-config'
import { PublicFooter } from '@/components/PublicFooter'

export const dynamic = 'force-static'
export const metadata:Metadata={title:'Guest rights'}

export default function GuestRightsPage() {
  const o=publicOperator()
  return (
    <><main className="legal" style={{ maxWidth: 920 }}>
      <span className="eyebrow">Guest rights</span>
      <h1>Review, challenge, or correct your GuestAtlas record</h1>
      <p>Hotel staff accounts and guest access are separate. Guests do not need a staff account. A participating property can issue a private GuestAtlas access link after verifying that the recipient is the guest connected to the record.</p>
      <section className="card panel section"><h2>If you already received an access link</h2><p>Open the private link sent by the property. The portal shows the feedback and published or challenged incidents connected to your record. Each item includes a challenge or correction form.</p><p>When a challenge is submitted, the adverse record is placed under review and is withheld from ordinary network consumers while the contributing property resolves the request.</p></section>
      <section className="card panel section"><h2>If you need access</h2><p>Contact the property that recorded your stay and ask for a GuestAtlas guest access link. The property must verify your identity before issuing access. Newly issued links are time-limited and can be revoked.</p><p>If you cannot identify or reach the relevant property, contact {o.privacyEmail?<a href={mailto(o.privacyEmail)}>{o.privacyEmail}</a>:'the GuestAtlas privacy contact listed in the applicable service notice'}. Do not send a passport, national ID, password, or evidence file by ordinary email unless a secure channel is specifically provided.</p></section>
      <section className="card panel section"><h2>What you can challenge</h2><p>You can submit a challenge or correction request against an individual stay-feedback record or a published incident. The request is stored as a formal dispute with review history. Additional rights may apply under the law relevant to you and the property.</p></section>
      <section className="card panel section"><h2>Identity verification</h2><p>Because a disclosure may reveal private personal information, GuestAtlas or the participating property may ask for proportionate information needed to verify identity or authority before granting access or making a change.</p></section>
      <p><Link href="/login">Hotel staff sign in</Link></p>
    </main><PublicFooter/></>
  )
}
