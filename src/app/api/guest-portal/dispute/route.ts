import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash, encryptPII } from '@/lib/crypto'
import { body, fail, ApiError, requiredString, assertSameOrigin } from '@/lib/http'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const store=await cookies()
    const token=store.get('guestatlas_guest_access')?.value
    if(!token)throw new ApiError(401,'Private guest access session required')
    const b = await body(request)
    const message = requiredString(b.message, 'Message', 3000)
    const admin = createAdminClient()
    const { data: t, error: tokenError } = await admin.from('guest_portal_tokens').select('*').eq('token_hash', tokenHash(token)).gt('expires_at', new Date().toISOString()).is('revoked_at', null).maybeSingle()
    if (tokenError) throw tokenError
    if (!t) throw new ApiError(401, 'Access link is invalid, revoked, or expired')

    const incidentId = typeof b.incidentId === 'string' && b.incidentId ? b.incidentId : null
    const feedbackId = typeof b.feedbackId === 'string' && b.feedbackId ? b.feedbackId : null
    if ((incidentId ? 1 : 0) + (feedbackId ? 1 : 0) !== 1) throw new ApiError(400, 'Select exactly one record to challenge')

    let sourceHotel: string
    if (incidentId) {
      const { data: incident, error } = await admin.from('incidents').select('hotel_id,guest_id,status').eq('id', incidentId).eq('guest_id', t.guest_id).maybeSingle()
      if (error) throw error
      if (!incident || !['published','under_review'].includes(incident.status)) throw new ApiError(404, 'Incident not found')
      sourceHotel = incident.hotel_id
    } else {
      const { data: feedback, error } = await admin.from('stay_feedback').select('hotel_id,guest_id,status').eq('id', feedbackId!).eq('guest_id', t.guest_id).maybeSingle()
      if (error) throw error
      if (!feedback || !['published','under_review'].includes(feedback.status)) throw new ApiError(404, 'Feedback not found')
      sourceHotel = feedback.hotel_id
    }

    await audit(admin, { hotelId: sourceHotel, userId: null, action: 'guest_dispute_requested', targetType: incidentId ? 'incident' : 'stay_feedback', targetId: incidentId || feedbackId, purpose: 'guest correction or dispute request' })
    const { data: disputeId, error: disputeError } = await admin.rpc('submit_guest_dispute', {
      p_guest_id: t.guest_id,p_incident_id: incidentId,p_feedback_id: feedbackId,p_message_cipher: encryptPII(message),
    })
    if (disputeError) {
      if (disputeError.code === '23505') throw new ApiError(409, 'An open challenge already exists for this record')
      throw disputeError
    }
    await audit(admin, { hotelId: sourceHotel, userId: null, action: 'guest_dispute_submitted', targetType: 'dispute', targetId: String(disputeId), purpose: 'guest correction or dispute request', metadata: { challengedType: incidentId ? 'incident' : 'stay_feedback', challengedId: incidentId || feedbackId } })

    if(process.env.RESEND_API_KEY){
      const{data:h}=await admin.from('hotels').select('name,legal_contact_email').eq('id',sourceHotel).maybeSingle()
      if(h?.legal_contact_email){
        const base=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin
        try{await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'GuestAtlas <noreply@example.com>',to:[h.legal_contact_email],subject:'GuestAtlas guest correction/dispute request',text:`A guest submitted a correction or dispute request for a record contributed by ${h.name}. No guest details are included in this email.\n\nReview securely: ${base}/disputes`})})}catch{}
      }
    }
    return NextResponse.redirect(new URL('/guest-portal?submitted=1', request.url), 303)
  } catch (e) { return fail(e, request) }
}
