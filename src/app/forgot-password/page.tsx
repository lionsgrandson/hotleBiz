import Link from 'next/link'
import { requestPasswordReset } from './actions'

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{error?:string;message?:string}> }) {
  const p = await searchParams
  return <main className="loginPage">
    <section className="loginPanel"><div className="card loginBox">
      <span className="eyebrow">Account recovery</span><h2>Reset your password</h2>
      {p.error && <p className="error">{p.error}</p>}{p.message && <p className="notice">{p.message}</p>}
      <form><label>Email<input type="email" name="email" autoComplete="email" required/></label>
      <button className="primary" formAction={requestPasswordReset}>Send reset email</button></form>
      <p><Link href="/login">Back to sign in</Link></p>
    </div></section>
  </main>
}
