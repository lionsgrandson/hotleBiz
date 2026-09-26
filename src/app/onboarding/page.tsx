import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createHotel } from './actions'

export const metadata: Metadata = { title: 'Property onboarding', robots: { index:false, follow:false } }

export default async function Onboarding() {
  await requireUser()
  return <main className="legal"><span className="eyebrow">Property onboarding</span><h1>Create your hotel workspace</h1><p>GuestAtlas is a shared personal-data network. An authorized representative must confirm the property's identity, permitted use, and privacy responsibilities before network processing is enabled.</p><form className="card simpleForm"><label>Hotel / property name<input name="name" maxLength={160} required /></label><label>Legal entity name<input name="legalEntityName" maxLength={200} required /></label><label>Company / registration number<input name="registrationNumber" maxLength={100} required /></label><label>City<input name="city" maxLength={120} required /></label><label>Country code<input name="countryCode" defaultValue="IL" maxLength={2} required /></label><label>Legal / privacy contact email<input name="legalEmail" type="email" maxLength={320} required /></label>
  <label className="checkLabel"><span><input name="authority" type="checkbox" required /> I am authorized to create and administer this workspace for the property.</span></label>
  <label className="checkLabel"><span><input name="legalBasis" type="checkbox" required /> I confirm the property will process and disclose personal information only where it has a documented lawful basis or authority and an actual hospitality purpose.</span></label>
  <label className="checkLabel"><span><input name="accuracy" type="checkbox" required /> I confirm the property will submit factual, relevant records, avoid protected traits and discriminatory use, and handle correction/dispute requests.</span></label>
  <label className="checkLabel"><span><input name="terms" type="checkbox" required /> I accept the <Link href="/terms">Network Terms</Link>, <Link href="/acceptable-use">Acceptable Use Policy</Link>, and acknowledge the <Link href="/privacy">Privacy Notice</Link>.</span></label>
  <div className="notice">New properties start in verification review. Team setup remains available while verification is pending. Guest personal-data processing and cross-hotel lookup stay locked until GuestAtlas verifies the property.</div><button className="primary" formAction={createHotel}>Submit property for verification</button></form></main>
}
