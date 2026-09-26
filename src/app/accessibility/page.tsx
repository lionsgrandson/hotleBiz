import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'
import { mailto, publicOperator } from '@/lib/public-config'

export const metadata: Metadata = { title: 'Accessibility' }

export default function Accessibility(){
  const o=publicOperator()
  return <><main className="legal"><span className="eyebrow">Accessibility statement</span><h1>Accessible use of GuestAtlas</h1>
  <p>GuestAtlas is designed to support keyboard navigation, semantic headings and landmarks, visible focus states, labeled form controls, responsive layouts, text alternatives where images convey information, and sufficient contrast. The launch target is conformance with the applicable Israeli web-accessibility requirements and Israeli Standard 5568 at level AA where those requirements apply.</p>
  <h2>Supported interaction</h2><p>Core workflows are intended to be usable without a mouse. Forms use programmatic labels, status messages are presented as text, and the interface avoids relying on color alone for meaning.</p>
  <h2>Known limitations</h2><p>Third-party authentication email content, browser-native file pickers, downloaded evidence documents, and documents supplied by participating properties may have accessibility characteristics outside the direct control of the web interface. Properties remain responsible for accessible documents they upload or provide where applicable.</p>
  <h2>Report a problem</h2><p>If you cannot complete a task or access information, contact {o.accessibilityEmail?<a href={mailto(o.accessibilityEmail)}>{o.accessibilityEmail}</a>:'the accessibility contact listed in the applicable service agreement'}. Include the page, device/browser, assistive technology if relevant, and the problem encountered. Do not send passport, national-ID, password, or evidence files by ordinary email.</p>
  </main><PublicFooter/></>
}
