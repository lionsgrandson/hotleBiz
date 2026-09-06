import Link from 'next/link'
import { login, signup } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const p = await searchParams
  return <main className="loginPage">
    <section className="loginHero"><span className="eyebrow" style={{color:'#d8bd86'}}>Verified hospitality intelligence</span><h1>Better stays start with better information.</h1><p>GuestAtlas gives participating hotels a structured, accountable way to record real stay outcomes, document incidents, and review a guest’s verified network history without turning the system into an unaccountable blacklist.</p></section>
    <section className="loginPanel"><div className="card loginBox"><span className="eyebrow">Staff access</span><h2>Sign in to your property</h2>{p.error && <p className="error">{p.error}</p>}{p.message && <p className="notice">{p.message}</p>}<form><label>Email<input type="email" name="email" required /></label><label>Password<input type="password" name="password" minLength={10} required /></label><button className="primary" formAction={login}>Sign in</button><button className="secondary" formAction={signup}>Create account</button></form><p style={{fontSize:12,color:'#66716c'}}>Access is restricted to authorized hotel staff. All guest lookups and record changes are audited.</p><p style={{fontSize:13}}><Link href="/guest-rights">Guest? Review your record or submit an appeal</Link></p></div></section>
  </main>
}
