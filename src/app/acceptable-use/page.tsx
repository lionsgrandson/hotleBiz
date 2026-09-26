import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'
import { POLICY_VERSION } from '@/lib/public-config'

export const metadata: Metadata = { title: 'Acceptable use' }

export default function AcceptableUse(){
  return <><main className="legal"><span className="eyebrow">Acceptable use · version {POLICY_VERSION}</span><h1>Rules for responsible network use</h1>
  <p>GuestAtlas contains personal information and potentially adverse hospitality records. Access is granted for narrow business purposes, not general investigation.</p>
  <h2>You may</h2><ul><li>record a genuine stay relationship and factual service feedback;</li><li>document a relevant incident using the least personal information necessary;</li><li>search for a guest when an actual or reasonably anticipated hospitality relationship creates a legitimate operational need;</li><li>review records within your assigned role and resolve genuine disputes or corrections.</li></ul>
  <h2>You may not</h2><ul><li>browse, scrape, enumerate, export, sell, republish, or build a separate guest list from network data;</li><li>search for friends, family, celebrities, employees, applicants, or any person for curiosity or a purpose unrelated to hospitality;</li><li>enter protected traits, diagnoses, irrelevant intimate information, insults, or speculation as a guest record;</li><li>present a report, suspicion, allegation, or disputed fact as verified when it is not;</li><li>use another person's account, share credentials, disable required security controls, or evade rate limits;</li><li>use GuestAtlas as an automatic blacklist or as the sole basis for an adverse decision.</li></ul>
  <h2>Enforcement</h2><p>Searches, access, moderation, role changes, and record changes are audited. Access may be restricted or revoked for misuse, and suspected unlawful or malicious activity may be preserved and escalated as required by applicable law or contract.</p>
  </main><PublicFooter/></>
}
