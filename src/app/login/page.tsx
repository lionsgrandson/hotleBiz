import type { Metadata } from 'next'
import Link from 'next/link'
import { login, signup } from './actions'

export const metadata: Metadata = { title: 'Staff sign in', robots: { index: false, follow: false } }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const p = await searchParams
  return <main className="loginPage">
    <section className="loginHero"><span className="eyebrow" style={{color:'#d8bd86'}}>Verified hospitality intelligence</span><h1>Staff access with accountability built in.</h1><p>GuestAtlas restricts shared guest information to verified participating properties and individual staff accounts. Searches, sensitive record access, moderation, and changes are audited.</p></section>
    <section className="loginPanel"><div className="card loginBox"><span className="eyebrow">Staff access</span><h2>Sign in</h2>{p.error && <p className="error" role="alert">{p.error}</p>}{p.message && <p className="notice" role="status">{p.message}</p>}
      <form><label>Email<input type="email" name="email" autoComplete="email" required /></label><label>Password<input type="password" name="password" autoComplete="current-password" required /></label><button className="primary" formAction={login}>Sign in</button></form>
      <p className="loginLinks"><Link href="/forgot-password">Forgot password?</Link> · <Link href="/guest-rights">Guest rights</Link></p>
      <details className="signupPanel"><summary>Create a staff account</summary><form><label>Full name<input name="fullName" autoComplete="name" maxLength={120} required /></label><label>Work email<input type="email" name="email" autoComplete="email" required /></label><label>Password<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label className="checkLabel"><span><input name="acceptTerms" type="checkbox" required /> I have read and accept the <Link href="/terms">Terms of Use</Link> and <Link href="/acceptable-use">Acceptable Use Policy</Link>.</span></label><label className="checkLabel"><span><input name="acceptPrivacy" type="checkbox" required /> I have read the <Link href="/privacy">Privacy Notice</Link>.</span></label><button className="secondary" formAction={signup}>Create account</button></form></details>
      <p style={{fontSize:12,color:'#66716c'}}>Hotel data access remains locked until email confirmation, MFA enrollment, property membership, and where applicable property verification are complete.</p>
    </div></section>
  </main>
}
