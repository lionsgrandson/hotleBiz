import Link from 'next/link'
import { PublicFooter } from '@/components/PublicFooter'

export default function Home() {
  return (
    <main className="publicSite">
      <header className="publicNav">
        <Link href="/" className="brand publicBrand"><span className="brandMark">G</span><span><strong>GuestAtlas</strong><small>Hospitality intelligence</small></span></Link>
        <nav aria-label="Primary">
          <Link href="/guest-rights">Guest rights</Link>
          <Link href="/security">Security</Link>
          <Link className="secondary" href="/login">Staff sign in</Link>
        </nav>
      </header>
      <section className="publicHero">
        <div>
          <span className="eyebrow">Verified hospitality intelligence</span>
          <h1>Accountable stay records. Controlled access. A right to challenge.</h1>
          <p>GuestAtlas helps participating properties document stay outcomes and serious incidents with identity matching, audit trails, moderation, and guest correction rights. It is not a public people directory and it does not make automatic booking decisions.</p>
          <div className="publicActions">
            <Link className="primary" href="/login">Hotel staff access</Link>
            <Link className="secondary" href="/guest-rights">Review guest rights</Link>
          </div>
        </div>
        <div className="card trustPanel">
          <span className="eyebrow">Built for controlled use</span>
          <h2>Production safeguards</h2>
          <ul>
            <li>Verified properties and individual staff accounts</li>
            <li>Mandatory authenticator-based MFA for staff operations</li>
            <li>Exact-match lookup rather than name browsing</li>
            <li>Private evidence storage and access logging</li>
            <li>Independent review for serious or unverified adverse incidents</li>
            <li>Guest disclosure, correction, and dispute workflows</li>
          </ul>
        </div>
      </section>
      <section className="publicFeatures" aria-label="How GuestAtlas works">
        <article><span>01</span><h2>Verify</h2><p>A property is reviewed before it can process shared network data. Staff access is role-based and revocable.</p></article>
        <article><span>02</span><h2>Document</h2><p>Stays, feedback, and incidents are tied to a verified guest relationship, with factual-content rules and evidence handling.</p></article>
        <article><span>03</span><h2>Review</h2><p>High-risk records require a second authorized person. Disputed records are withheld from network consumers during review.</p></article>
        <article><span>04</span><h2>Correct</h2><p>Guests can receive a private disclosure link and challenge individual feedback or incident records.</p></article>
      </section>
      <section className="publicStatement">
        <span className="eyebrow">Important</span>
        <h2>Information supports a human decision; it does not replace one.</h2>
        <p>Participating properties remain responsible for lawful, proportionate use, identity verification, record accuracy, and handling guest rights requests.</p>
      </section>
      <PublicFooter />
    </main>
  )
}
