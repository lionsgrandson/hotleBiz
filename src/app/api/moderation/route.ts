import { NextResponse } from 'next/server'
import { apiContext, body, fail, requiredString, ApiError, mustDb } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification is required before processing guest network data.')
    const b = await body(request)
    const id = requiredString(b.incidentId, 'Incident', 60)
    const decision = String(b.decision)
    const { data: incident, error } = await admin.from('incidents').select('id,created_by,status').eq('id', id).eq('hotel_id', hotel.id).maybeSingle()
    if (error) throw error
    if (!incident) throw new ApiError(404, 'Incident not found')
    if (incident.status !== 'pending_review') throw new ApiError(409, 'Incident is not awaiting moderation')
    if (incident.created_by === user.id) throw new ApiError(409, 'A serious incident must be reviewed by a different authorized staff member')
    if (!['publish','reject'].includes(decision)) throw new ApiError(400, 'Invalid decision')

    await audit(admin, { hotelId: hotel.id, userId: user.id, action: decision === 'publish' ? 'incident_review_approval_requested' : 'incident_review_rejection_requested', targetType: 'incident', targetId: id, purpose: 'serious incident moderation' })
    const now = new Date().toISOString()
    await mustDb(admin.from('incidents').update(decision === 'publish'
      ? { status: 'published', published_at: now, reviewed_by: user.id, reviewed_at: now }
      : { status: 'removed', reviewed_by: user.id, reviewed_at: now }).eq('id', id).eq('status', 'pending_review').select('id').single())
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: decision === 'publish' ? 'incident_review_approved' : 'incident_review_rejected', targetType: 'incident', targetId: id })
    return NextResponse.redirect(new URL('/moderation', request.url), 303)
  } catch (e) { return fail(e, request) }
}
