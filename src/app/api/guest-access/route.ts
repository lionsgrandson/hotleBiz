import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, mustDb } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { hasLocalGuestRelationship } from '@/lib/access'
import { randomToken, tokenHash } from '@/lib/crypto'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification required')
    const b = await body(request)
    const guestId = requiredString(b.guestId, 'Guest', 60)
    if (!await hasLocalGuestRelationship(admin, hotel.id, guestId)) throw new ApiError(403, 'This property has no verified relationship with the guest')
    const token = randomToken()
    await mustDb(admin.from('guest_portal_tokens').insert({ guest_id: guestId, source_hotel_id: hotel.id, token_hash: tokenHash(token), expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), created_by: user.id }))
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'guest_portal_link_created', targetType: 'guest', targetId: guestId, purpose: 'guest access and correction rights' })
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const link = `${base}/guest-portal/${token}`
    return NextResponse.redirect(new URL(`/guest-access/${guestId}?link=${encodeURIComponent(link)}`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
