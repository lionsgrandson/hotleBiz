import { NextResponse } from 'next/server'
import { apiContext, body, fail, requiredString, ApiError, mustDb } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { randomToken, tokenHash } from '@/lib/crypto'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user, membership } = await apiContext(request, MANAGE_ROLES)
    const b = await body(request)
    const email = requiredString(b.email, 'Email', 320).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address')
    const role = String(b.role)
    if (!['admin', 'manager', 'reviewer', 'viewer'].includes(role)) throw new ApiError(400, 'Invalid role')
    if (role === 'admin' && !['owner', 'admin'].includes(String(membership.role))) throw new ApiError(403, 'Only owners/admins can invite admins')

    const token = randomToken()
    await mustDb(admin.from('hotel_invites').insert({
      hotel_id: hotel.id,
      email,
      role,
      token_hash: tokenHash(token),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      invited_by: user.id,
    }))

    const url = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/join/${token}`
    let emailSent = false
    if (process.env.RESEND_API_KEY) {
      const send = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'GuestAtlas <noreply@example.com>',
          to: [email],
          subject: `Invitation to ${hotel.name} on GuestAtlas`,
          text: `You were invited to join ${hotel.name} on GuestAtlas.\n\nAccept invitation: ${url}\n\nThis link expires in 7 days.`,
        }),
      })
      emailSent = send.ok
    }
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'staff_invited', targetType: 'hotel_invite', purpose: 'staff administration', metadata: { emailHash: tokenHash(email), role, emailSent } })
    return NextResponse.redirect(new URL(`/team?invite=${encodeURIComponent(url)}`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
