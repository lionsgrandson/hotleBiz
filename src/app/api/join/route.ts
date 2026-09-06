import { NextResponse } from 'next/server'
import { assertSameOrigin, body, fail, ApiError, requiredString, mustDb } from '@/lib/http'
import { hasRequiredMfa, getVerifiedUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash } from '@/lib/crypto'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    if (!await hasRequiredMfa()) throw new ApiError(403, 'Complete MFA setup before accepting a property invitation.')
    const user = await getVerifiedUser()
    if (!user) throw new ApiError(401, 'Authentication required')
    const b = await body(request), token = requiredString(b.token, 'Token', 200)
    const admin = createAdminClient()
    const { data: invite, error: inviteError } = await admin.from('hotel_invites').select('*').eq('token_hash', tokenHash(token)).gt('expires_at', new Date().toISOString()).is('accepted_at', null).maybeSingle()
    if (inviteError) throw inviteError
    if (!invite) throw new ApiError(404, 'Invitation is invalid or expired')
    if ((user.email || '').toLowerCase() !== invite.email.toLowerCase()) throw new ApiError(403, 'Invitation email does not match this account')

    await mustDb(admin.from('hotel_memberships').upsert({ hotel_id: invite.hotel_id, user_id: user.id, role: invite.role, status: 'active' }, { onConflict: 'hotel_id,user_id' }))
    const accepted = await mustDb<any>(admin.from('hotel_invites').update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq('id', invite.id).is('accepted_at', null).select('id').single())
    if (!accepted?.data?.id) throw new ApiError(409, 'Invitation was already accepted')
    await audit(admin, { hotelId: invite.hotel_id, userId: user.id, action: 'staff_invitation_accepted', targetType: 'hotel_invite', targetId: invite.id, purpose: 'staff administration' })

    const res = NextResponse.redirect(new URL('/dashboard', request.url), 303)
    res.cookies.set('guestatlas_hotel', invite.hotel_id, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/' })
    return res
  } catch (e) { return fail(e, request) }
}
