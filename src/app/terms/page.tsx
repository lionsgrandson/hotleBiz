import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'
import { mailto, POLICY_VERSION, publicOperator } from '@/lib/public-config'

export const metadata: Metadata = { title: 'Terms of use' }

export default function Terms(){
  const o=publicOperator()
  return <><main className="legal"><span className="eyebrow">Terms of use · version {POLICY_VERSION}</span><h1>GuestAtlas network terms</h1>
  <p>These service terms govern access to GuestAtlas operated by <strong>{o.legalName}</strong>. A separate commercial or data-processing agreement may impose additional terms on a participating property; where there is a conflict, the signed agreement controls to the extent permitted by law.</p>
  <h2>Authorized business use only</h2><p>Staff access is for authorized hospitality work tied to an actual or reasonably anticipated guest relationship, property or staff safety, property protection, payment administration, service quality, dispute handling, or another documented lawful hospitality purpose. Public searching, curiosity searches, stalking, employee screening, marketing lists, or unrelated profiling are prohibited.</p>
  <h2>Accounts and security</h2><p>Each user must use an individual account, protect credentials and MFA factors, and immediately report suspected compromise. Shared accounts, credential lending, attempts to bypass access controls, bulk scraping, and extraction of network data are prohibited. Properties must remove access promptly when a person's role changes or employment ends.</p>
  <h2>Accuracy and evidence</h2><p>Contributors must identify the correct guest and stay, distinguish direct observations from reports, use factual and proportionate language, avoid speculation about motive or character, preserve relevant evidence where appropriate, and correct inaccuracies without undue delay. Serious or unverified adverse incident records are subject to independent review before publication.</p>
  <h2>Prohibited content and discrimination</h2><p>Do not contribute protected characteristics, health or disability information, political or religious views, sexuality or sex-life information, biometric/genetic profiling, irrelevant family information, insults, threats, diagnoses, rumors presented as fact, or other information that is unnecessary for the permitted hospitality purpose. Network information must not be used as a proxy for unlawful discrimination.</p>
  <h2>Human decision required</h2><p>GuestAtlas does not provide an automatic booking-denial decision. A property must make its own lawful and proportionate decision and consider identity confidence, record age, evidence status, disputes, corrections, and context.</p>
  <h2>Guest rights and disputes</h2><p>Properties must cooperate with valid access, correction, dispute, retention, and regulator requests applicable to information they contribute. Challenged adverse records are withheld from ordinary network consumers while the dispute is reviewed.</p>
  <h2>Evidence and confidential information</h2><p>Evidence may contain sensitive operational information and must be uploaded only when relevant and lawfully held. Users must not download, copy, or redistribute evidence except where authorized for the documented purpose.</p>
  <h2>Suspension and termination</h2><p>GuestAtlas may suspend or revoke a property or user where necessary to protect security, privacy, data accuracy, guest rights, the network, or compliance with these terms. Audit records and legally required records may be retained after access ends.</p>
  <h2>Service availability</h2><p>The service is provided subject to maintenance, security controls, third-party infrastructure availability, and applicable agreements. No score or record is a guarantee of future guest behavior, and users remain responsible for independent judgment.</p>
  <h2>Contact</h2><p>Questions about these terms or authorized use may be sent to {o.privacyEmail?<a href={mailto(o.privacyEmail)}>{o.privacyEmail}</a>:'the operator contact in your service agreement'}.</p>
  </main><PublicFooter/></>
}
