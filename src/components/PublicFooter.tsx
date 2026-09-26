import Link from 'next/link'
import { mailto, publicOperator } from '@/lib/public-config'

export function PublicFooter() {
  const operator = publicOperator()
  return (
    <footer className="publicFooter">
      <div>
        <strong>GuestAtlas</strong>
        <span>{operator.legalName}{operator.country ? ` · ${operator.country}` : ''}</span>
      </div>
      <nav aria-label="Legal and support">
        <Link href="/guest-rights">Guest rights</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/acceptable-use">Acceptable use</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/accessibility">Accessibility</Link>
        <Link href="/security">Security</Link>
        {operator.privacyEmail && <a href={mailto(operator.privacyEmail)}>Privacy contact</a>}
      </nav>
    </footer>
  )
}
