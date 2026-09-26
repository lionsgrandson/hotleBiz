import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'

export const metadata: Metadata = { title: 'Cookies' }

export default function Cookies(){
  return <><main className="legal"><span className="eyebrow">Cookie notice</span><h1>Essential storage only</h1>
  <p>GuestAtlas does not require advertising or cross-site marketing cookies to operate. The service uses essential authentication and security storage supplied by the identity system and an essential property-selection cookie for signed-in staff who belong to more than one property.</p>
  <h2>Authentication</h2><p>Authentication cookies or equivalent browser storage keep a signed-in session, refresh that session, and support security controls such as MFA. Blocking them prevents staff sign-in from working correctly.</p>
  <h2>Property selection</h2><p>The <code>guestatlas_hotel</code> cookie remembers the active property for a signed-in staff member. It is HTTP-only, same-site restricted, secure on HTTPS, and is used only to choose the current authorized workspace.</p>
  <h2>Analytics</h2><p>The production application does not set an advertising analytics cookie by default. If optional analytics or other non-essential tracking is introduced later, this notice and any required consent mechanism must be updated before that tracking is enabled.</p>
  </main><PublicFooter/></>
}
