import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, mustDb, ok } from '@/lib/http'
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
    const now=new Date().toISOString()
    await mustDb(admin.from('guest_portal_tokens').update({revoked_at:now}).eq('guest_id',guestId).eq('source_hotel_id',hotel.id).is('revoked_at',null))
    const token = randomToken()
    await mustDb(admin.from('guest_portal_tokens').insert({ guest_id: guestId, source_hotel_id: hotel.id, token_hash: tokenHash(token), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), created_by: user.id }))
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'guest_portal_link_created', targetType: 'guest', targetId: guestId, purpose: 'guest access and correction rights',metadata:{validDays:7,previousLinksRevoked:true,fragmentCredential:true} })
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const link = `${base}/guest-portal#access=${encodeURIComponent(token)}`
    if((request.headers.get('content-type')||'').includes('application/json'))return ok({link,expiresInDays:7})
    return NextResponse.redirect(new URL(`/guest-access/${guestId}`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
