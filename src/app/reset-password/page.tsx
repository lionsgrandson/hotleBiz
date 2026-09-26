import type { Metadata } from 'next'
import { getVerifiedUser } from '@/lib/auth'
import { updatePassword } from './actions'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Choose new password', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ResetPassword({searchParams}:{searchParams:Promise<{error?:string}>}){
  const user=await getVerifiedUser()
  const p=await searchParams
  if(!user)return <main className="loginPanel" style={{minHeight:'100vh'}}><section className="card loginBox"><h2>Reset session expired</h2><p>Request a new password reset link.</p><Link className="primary" href="/forgot-password">Request reset link</Link></section></main>
  return <main className="loginPanel" style={{minHeight:'100vh'}}><section className="card loginBox"><span className="eyebrow">Account recovery</span><h2>Choose a new password</h2>{p.error&&<p className="error" role="alert">{p.error}</p>}<form action={updatePassword}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><button className="primary">Update password</button></form></section></main>
}
