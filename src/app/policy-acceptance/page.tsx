import type { Metadata } from 'next'
import Link from 'next/link'
import { requireMfa, requireUser } from '@/lib/auth'
import { POLICY_VERSION } from '@/lib/public-config'
import { acceptCurrentPolicies } from './actions'

export const metadata:Metadata={title:'Policy acknowledgement',robots:{index:false,follow:false}}
export const dynamic='force-dynamic'

export default async function PolicyAcceptance({searchParams}:{searchParams:Promise<{error?:string}>}){
  await requireUser();await requireMfa();const p=await searchParams
  return <main className="loginPanel" style={{minHeight:'100vh'}}><form className="card loginBox" action={acceptCurrentPolicies}><span className="eyebrow">Policy update · {POLICY_VERSION}</span><h2>Review before continuing</h2><p>GuestAtlas handles shared personal information. Staff must acknowledge the current rules before accessing hotel data.</p>{p.error&&<p className="error">Accept all required policies to continue.</p>}<label className="checkLabel"><span><input name="terms" type="checkbox" required/> I accept the <Link href="/terms">Network Terms</Link>.</span></label><label className="checkLabel"><span><input name="acceptableUse" type="checkbox" required/> I accept the <Link href="/acceptable-use">Acceptable Use Policy</Link>.</span></label><label className="checkLabel"><span><input name="privacy" type="checkbox" required/> I acknowledge the <Link href="/privacy">Privacy Notice</Link>.</span></label><button className="primary">Accept and continue</button></form></main>
}
