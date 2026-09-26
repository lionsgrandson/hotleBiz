import type { Metadata } from 'next'
import Link from 'next/link'
import { requestPasswordReset } from './actions'

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false } }

export default async function ForgotPassword({searchParams}:{searchParams:Promise<{message?:string}>}){
  const p=await searchParams
  return <main className="loginPanel" style={{minHeight:'100vh'}}><section className="card loginBox"><span className="eyebrow">Account recovery</span><h2>Reset your password</h2><p>Enter the email attached to your staff account. The response is intentionally the same whether or not an account exists.</p>{p.message&&<p className="notice" role="status">{p.message}</p>}<form action={requestPasswordReset}><label>Email<input name="email" type="email" autoComplete="email" required/></label><button className="primary">Send reset link</button></form><p className="loginLinks"><Link href="/login">Back to sign in</Link></p></section></main>
}
