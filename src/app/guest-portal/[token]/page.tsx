import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash, decryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: portalToken, error: tokenError } = await admin
    .from('guest_portal_tokens')
    .select('*')
    .eq('token_hash', tokenHash(token))
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .maybeSingle()
  if (tokenError) throw tokenError
  if (!portalToken) notFound()

  await audit(admin, {
    hotelId: portalToken.source_hotel_id,
    userId: null,
    action: 'guest_portal_viewed',
    targetType: 'guest',
    targetId: portalToken.guest_id,
    purpose: 'guest personal data access',
  })

  const [guestResult, feedbackResult, incidentResult] = await Promise.all([
    admin.from('guests').select('*').eq('id', portalToken.guest_id).single(),
    admin.from('stay_feedback').select('id,overall_score,summary_cipher,would_host_again,published_at,status,dispute_status,hotel_id').eq('guest_id', portalToken.guest_id).in('status', ['published', 'under_review']),
    admin.from('incidents').select('id,category,severity,title_cipher,description_cipher,occurred_at,status,dispute_status,evidence_level,hotel_id').eq('guest_id', portalToken.guest_id).in('status', ['published', 'under_review']),
  ])
  if (guestResult.error) throw guestResult.error
  if (feedbackResult.error) throw feedbackResult.error
  if (incidentResult.error) throw incidentResult.error

  const guest = guestResult.data
  const feedback = feedbackResult.data || []
  const incidents = incidentResult.data || []

  return (
    <main className="legal">
      <span className="eyebrow">GuestAtlas personal data access</span>
      <h1>{decryptPII(guest.legal_name_cipher) || 'Guest record'}</h1>
      <p>This private page lets you review information held in the GuestAtlas network and challenge or request correction of a specific item. It does not expose other guests or internal hotel notes.</p>

      <h2>Stay feedback</h2>
      {!feedback.length ? <p>No visible feedback.</p> : feedback.map((x: any) => (
        <section className="card panel section" key={x.id}>
          <strong>Score {Math.round(Number(x.overall_score) * 20)}/100</strong>
          <p>Dispute status: {x.dispute_status}.</p>
          <p>{decryptPII(x.summary_cipher) || 'No written summary.'}</p>
          <form action="/api/guest-portal/dispute" method="post" className="simpleForm" style={{ padding: 0 }}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="feedbackId" value={x.id} />
            <label>Challenge / correction request<textarea name="message" required /></label>
            <button className="secondary">Submit request</button>
          </form>
        </section>
      ))}

      <h2>Published incidents</h2>
      {!incidents.length ? <p>No published incidents.</p> : incidents.map((x: any) => (
        <section className="card panel section" key={x.id}>
          <span className={`badge ${x.severity >= 3 ? 'danger' : 'warn'}`}>Severity {x.severity}/4</span>
          <h2>{decryptPII(x.title_cipher)}</h2>
          <p>{decryptPII(x.description_cipher)}</p>
          <p>Evidence status: {x.evidence_level}. Dispute status: {x.dispute_status}.</p>
          <form action="/api/guest-portal/dispute" method="post" className="simpleForm" style={{ padding: 0 }}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="incidentId" value={x.id} />
            <label>Challenge / correction request<textarea name="message" required /></label>
            <button className="secondary">Submit request</button>
          </form>
        </section>
      ))}
    </main>
  )
}
