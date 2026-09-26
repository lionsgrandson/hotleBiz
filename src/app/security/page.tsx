import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'
import { mailto, publicOperator } from '@/lib/public-config'

export const metadata: Metadata = { title: 'Security' }

export default function Security(){
  const o=publicOperator()
  return <><main className="legal"><span className="eyebrow">Security</span><h1>Protecting a sensitive hospitality network</h1>
  <p>GuestAtlas uses layered controls intended to reduce unauthorized access, data leakage, false identity matching, unreviewed adverse reporting, and abuse of shared guest information.</p>
  <h2>Core controls</h2><ul><li>individual staff identities and role-based access;</li><li>mandatory TOTP MFA for staff operations;</li><li>server-side business-data access with privileged database credentials kept out of browser code;</li><li>AES-256-GCM encryption for core guest identity and guest-linked free text;</li><li>separate keyed HMAC values for exact-match identity lookup;</li><li>private evidence storage with type, size, signature, and authorization checks;</li><li>short-lived guest-network access grants, business-purpose capture, search limits, and append-only audit history;</li><li>independent moderation for high-risk or unverified adverse incident records;</li><li>guest dispute withholding and revision history;</li><li>security response headers and no-index controls around private application surfaces.</li></ul>
  <h2>Responsible disclosure</h2><p>If you believe you found a security vulnerability, report it privately to {o.securityEmail?<a href={mailto(o.securityEmail)}>{o.securityEmail}</a>:'the security contact in the applicable service agreement'}. Include enough detail to reproduce the issue, but do not access unrelated guest records, download evidence unnecessarily, disrupt availability, or publish personal information.</p>
  <p>For machine-readable disclosure contact details, see <a href="/.well-known/security.txt">security.txt</a>.</p>
  </main><PublicFooter/></>
}
