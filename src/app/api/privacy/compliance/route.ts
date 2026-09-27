import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, optionalString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

function optionalEmail(value: unknown, label: string) {
  const v = optionalString(value, 254)
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ApiError(400, `${label} is invalid`)
  return v?.toLowerCase() || null
}

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, MANAGE_ROLES)
    const b = await body(request)
    const lastReviewRaw = optionalString(b.lastLegalReviewAt, 10)
    if (lastReviewRaw && !/^\d{4}-\d{2}-\d{2}$/.test(lastReviewRaw)) throw new ApiError(400, 'Last legal review date is invalid')

    const record = {
      hotel_id: hotel.id,
      privacy_contact_email: optionalEmail(b.privacyContactEmail, 'Privacy contact email'),
      dpo_name: optionalString(b.dpoName, 200),
      dpo_email: optionalEmail(b.dpoEmail, 'DPO email'),
      dpo_requirement_reviewed: String(b.dpoRequirementReviewed || '') === 'true',
      lawful_basis_notes: optionalString(b.lawfulBasisNotes, 5000),
      international_transfer_notes: optionalString(b.internationalTransferNotes, 5000),
      breach_contact_email: optionalEmail(b.breachContactEmail, 'Breach contact email'),
      privacy_notice_version: optionalString(b.privacyNoticeVersion, 100),
      terms_version: optionalString(b.termsVersion, 100),
      last_legal_review_at: lastReviewRaw ? new Date(`${lastReviewRaw}T00:00:00.000Z`).toISOString() : null,
      updated_by: user.id,
    }

    const { error } = await admin.from('hotel_compliance_profiles').upsert(record, { onConflict: 'hotel_id' })
    if (error) throw error
    await audit(admin, {
      hotelId: hotel.id,
      userId: user.id,
      action: 'hotel_compliance_profile_updated',
      targetType: 'hotel',
      targetId: hotel.id,
      purpose: 'privacy and compliance administration',
      metadata: { dpoRequirementReviewed: record.dpo_requirement_reviewed, hasLegalReviewDate: Boolean(record.last_legal_review_at) },
    })
    return NextResponse.redirect(new URL('/privacy-center', request.url), 303)
  } catch (e) { return fail(e, request) }
}
