import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    const b = await body(request)
    const tokenId = requiredString(b.tokenId, 'Access link', 60)
    const guestId = requiredString(b.guestId, 'Guest', 60)

    const { data, error: loadError } = await admin.from('guest_portal_tokens')
      .select('id,guest_id')
      .eq('id', tokenId)
      .eq('source_hotel_id', hotel.id)
      .eq('guest_id', guestId)
      .is('revoked_at', null)
      .maybeSingle()
    if (loadError) throw loadError
    if (!data) throw new ApiError(404, 'Active access link not found')

    const { error } = await admin.from('guest_portal_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)
      .eq('source_hotel_id', hotel.id)
    if (error) throw error

    await audit(admin, {
      hotelId: hotel.id,
      userId: user.id,
      action: 'guest_portal_link_revoked',
      targetType: 'guest',
      targetId: guestId,
      purpose: 'guest access link lifecycle',
      metadata: { tokenId },
    })
    return NextResponse.redirect(new URL(`/guest-access/${guestId}`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
