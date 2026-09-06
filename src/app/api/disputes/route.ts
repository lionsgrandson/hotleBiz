import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, optionalString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { encryptPII } from '@/lib/crypto'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification is required before processing guest network data.')
    const b = await body(request)
    const id = requiredString(b.disputeId, 'Dispute', 60)
    const response = requiredString(b.response, 'Response', 3000)
    const replacement = optionalString(b.replacementText, 5000)
    const decision = String(b.decision)
    if (!['accepted','rejected'].includes(decision)) throw new ApiError(400, 'Invalid decision')

    const { data: dispute, error: loadError } = await admin.from('disputes').select('id,status,incident_id,feedback_id').eq('id', id).eq('source_hotel_id', hotel.id).maybeSingle()
    if (loadError) throw loadError
    if (!dispute) throw new ApiError(404, 'Dispute not found')
    if (!['pending','reviewing'].includes(dispute.status)) throw new ApiError(409, 'Dispute has already been resolved')

    await audit(admin, { hotelId: hotel.id, userId: user.id, action: `dispute_${decision}_requested`, targetType: 'dispute', targetId: id, purpose: 'guest correction/dispute resolution' })
    const { error } = await admin.rpc('resolve_guest_dispute', {
      p_dispute_id: id,
      p_hotel_id: hotel.id,
      p_user_id: user.id,
      p_decision: decision,
      p_response_cipher: encryptPII(response),
      p_replacement_cipher: encryptPII(replacement),
    })
    if (error) throw error
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: `dispute_${decision}`, targetType: 'dispute', targetId: id, purpose: 'guest correction/dispute resolution' })
    return NextResponse.redirect(new URL('/disputes', request.url), 303)
  } catch (e) { return fail(e, request) }
}
