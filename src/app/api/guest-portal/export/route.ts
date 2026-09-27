import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash, decryptPII } from '@/lib/crypto'
import { body, fail, ApiError, requiredString, assertSameOrigin } from '@/lib/http'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const b = await body(request)
    const token = requiredString(b.token, 'Token', 200)
    const admin = createAdminClient()
    const { data: t, error: tokenError } = await admin.from('guest_portal_tokens')
      .select('guest_id,source_hotel_id')
      .eq('token_hash', tokenHash(token))
      .gt('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .maybeSingle()
    if (tokenError) throw tokenError
    if (!t) throw new ApiError(401, 'Access link is invalid or expired')

    const [guestResult, feedbackResult, incidentResult] = await Promise.all([
      admin.from('guests').select('id,legal_name_cipher,dob_cipher,email_cipher,phone_cipher,country_code,record_status,created_at,updated_at').eq('id', t.guest_id).single(),
      admin.from('stay_feedback').select('id,overall_score,would_host_again,summary_cipher,published_at,status,dispute_status').eq('guest_id', t.guest_id).in('status', ['published','under_review']),
      admin.from('incidents').select('id,category,severity,evidence_level,title_cipher,description_cipher,occurred_at,published_at,status,dispute_status').eq('guest_id', t.guest_id).in('status', ['published','under_review']),
    ])
    if (guestResult.error) throw guestResult.error
    if (feedbackResult.error) throw feedbackResult.error
    if (incidentResult.error) throw incidentResult.error

    const g = guestResult.data
    const payload = {
      generatedAt: new Date().toISOString(),
      guest: {
        id: g.id,
        legalName: decryptPII(g.legal_name_cipher),
        dateOfBirth: decryptPII(g.dob_cipher),
        email: decryptPII(g.email_cipher),
        phone: decryptPII(g.phone_cipher),
        countryCode: g.country_code,
        recordStatus: g.record_status,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      },
      feedback: (feedbackResult.data || []).map((x:any) => ({
        id: x.id,
        score: Math.round(Number(x.overall_score) * 20),
        wouldHostAgain: x.would_host_again,
        summary: decryptPII(x.summary_cipher),
        publishedAt: x.published_at,
        status: x.status,
        disputeStatus: x.dispute_status,
      })),
      incidents: (incidentResult.data || []).map((x:any) => ({
        id: x.id,
        category: x.category,
        severity: x.severity,
        evidenceLevel: x.evidence_level,
        title: decryptPII(x.title_cipher),
        description: decryptPII(x.description_cipher),
        occurredAt: x.occurred_at,
        publishedAt: x.published_at,
        status: x.status,
        disputeStatus: x.dispute_status,
      })),
    }

    await audit(admin, {
      hotelId: t.source_hotel_id,
      userId: null,
      action: 'guest_data_export_downloaded',
      targetType: 'guest',
      targetId: t.guest_id,
      purpose: 'guest personal data access/export',
    })

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="guestatlas-data-export.json"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) { return fail(e, request) }
}
