import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash, encryptPII } from '@/lib/crypto'
import { body, fail, ApiError, requiredString, optionalString, assertSameOrigin } from '@/lib/http'
import { audit } from '@/lib/audit'

const REQUEST_TYPES = new Set(['access','export','rectification','erasure','restriction','objection','other'])

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const b = await body(request)
    const token = requiredString(b.token, 'Token', 200)
    const requestType = requiredString(b.requestType, 'Request type', 40)
    if (!REQUEST_TYPES.has(requestType)) throw new ApiError(400, 'Invalid privacy request type')
    const message = optionalString(b.message, 3000)

    const admin = createAdminClient()
    const { data: t, error: tokenError } = await admin.from('guest_portal_tokens')
      .select('id,guest_id,source_hotel_id')
      .eq('token_hash', tokenHash(token))
      .gt('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .maybeSingle()
    if (tokenError) throw tokenError
    if (!t) throw new ApiError(401, 'Access link is invalid or expired')

    const { data: created, error } = await admin.from('data_rights_requests').insert({
      guest_id: t.guest_id,
      source_hotel_id: t.source_hotel_id,
      request_type: requestType,
      message_cipher: encryptPII(message),
      status: 'identity_verified',
      identity_verified_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw error

    await audit(admin, {
      hotelId: t.source_hotel_id,
      userId: null,
      action: 'guest_data_rights_request_submitted',
      targetType: 'data_rights_request',
      targetId: created.id,
      purpose: 'guest privacy/data-rights request',
      metadata: { requestType },
    })
    return NextResponse.redirect(new URL(`/guest-portal/${token}?privacySubmitted=1`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
