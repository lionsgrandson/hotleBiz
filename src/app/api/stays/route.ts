import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, optionalString, mustDb, isoDate } from '@/lib/http'
import { audit } from '@/lib/audit'
import { WRITE_ROLES } from '@/lib/auth'
import { hasGuestAccess } from '@/lib/access'
import { encryptPII } from '@/lib/crypto'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, WRITE_ROLES)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification is required before processing guest network data.')
    const b = await body(request), guestId = requiredString(b.guestId, 'Guest', 60), checkIn = isoDate(b.checkIn, 'Check in', { allowFuture: true }), checkOut = isoDate(b.checkOut, 'Check out', { allowFuture: true })
    if (!await hasGuestAccess(admin, hotel.id, user.id, guestId)) throw new ApiError(403, 'Search and verify this guest before linking a new stay.')
    if (checkOut < checkIn) throw new ApiError(400, 'Check-out cannot be before check-in')
    const status = ['booked', 'checked_in', 'completed', 'cancelled'].includes(String(b.status)) ? String(b.status) : 'completed'
    const { data, error } = await admin.from('stays').insert({ hotel_id: hotel.id, guest_id: guestId, reservation_ref_cipher: encryptPII(optionalString(b.reservationRef, 120)), check_in: checkIn, check_out: checkOut, room_ref_cipher: encryptPII(optionalString(b.room, 80)), status, created_by: user.id }).select('id').single()
    if (error) throw error
    const { data: existing } = await admin.from('guest_hotel_links').select('first_stay_at,last_stay_at').eq('guest_id', guestId).eq('hotel_id', hotel.id).maybeSingle()
    const first = existing?.first_stay_at && existing.first_stay_at.slice(0,10) <= checkIn ? existing.first_stay_at : `${checkIn}T00:00:00.000Z`
    const last = existing?.last_stay_at && existing.last_stay_at.slice(0,10) >= checkOut ? existing.last_stay_at : `${checkOut}T00:00:00.000Z`
    await mustDb(admin.from('guest_hotel_links').upsert({ guest_id: guestId, hotel_id: hotel.id, first_stay_at: first, last_stay_at: last, relationship_status: 'active' }, { onConflict: 'guest_id,hotel_id' }))
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'stay_created', targetType: 'stay', targetId: data.id, metadata: { guestId } })
    return NextResponse.redirect(new URL(`/guests/${guestId}?purpose=property%20stay%20record`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
