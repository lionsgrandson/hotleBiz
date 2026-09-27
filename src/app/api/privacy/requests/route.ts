import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, optionalString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { encryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'

const STATUSES = new Set(['identity_verified','in_progress','completed','partially_completed','rejected'])

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    const b = await body(request)
    const id = requiredString(b.requestId, 'Request', 60)
    const status = requiredString(b.status, 'Status', 40)
    if (!STATUSES.has(status)) throw new ApiError(400, 'Invalid request status')
    const response = optionalString(b.response, 5000)

    const { data: existing, error: loadError } = await admin.from('data_rights_requests')
      .select('id,status,request_type')
      .eq('id', id)
      .eq('source_hotel_id', hotel.id)
      .maybeSingle()
    if (loadError) throw loadError
    if (!existing) throw new ApiError(404, 'Privacy request not found')

    const terminal = ['completed','partially_completed','rejected'].includes(status)
    const { error } = await admin.from('data_rights_requests').update({
      status,
      response_cipher: encryptPII(response),
      resolved_by: terminal ? user.id : null,
      resolved_at: terminal ? new Date().toISOString() : null,
    }).eq('id', id).eq('source_hotel_id', hotel.id)
    if (error) throw error

    await audit(admin, {
      hotelId: hotel.id,
      userId: user.id,
      action: 'data_rights_request_updated',
      targetType: 'data_rights_request',
      targetId: id,
      purpose: 'privacy/data-rights workflow',
      metadata: { requestType: existing.request_type, from: existing.status, to: status },
    })
    return NextResponse.redirect(new URL('/privacy-center', request.url), 303)
  } catch (e) { return fail(e, request) }
}
