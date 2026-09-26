import { publicOperator } from '@/lib/public-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const o=publicOperator()
  const contact=o.securityEmail ? `mailto:${o.securityEmail}` : `mailto:${o.privacyEmail}`
  const body=[
    `Contact: ${contact}`,
    `Expires: 2027-09-26T23:59:59Z`,
    `Canonical: ${o.appUrl}/.well-known/security.txt`,
    `Policy: ${o.appUrl}/security`,
    'Preferred-Languages: en, he',
    '',
  ].join('\n')
  return new Response(body,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}})
}
