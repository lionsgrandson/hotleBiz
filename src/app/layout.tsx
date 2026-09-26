import type { Metadata } from 'next'
import './globals.css'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'GuestAtlas', template: '%s · GuestAtlas' },
  description: 'Structured, auditable hotel guest stay feedback and incident intelligence with controlled access and guest correction rights.',
  applicationName: 'GuestAtlas',
  alternates: { canonical: '/' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skipLink" href="#main-content">Skip to main content</a><div id="main-content">{children}</div></body></html>
}
