import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { apiContext, fail, ApiError, requiredString, optionalString, integerIn } from '@/lib/http'
import { WRITE_ROLES } from '@/lib/auth'
import { hasLocalGuestRelationship } from '@/lib/access'
import { encryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'

export const runtime = 'nodejs'

const CATEGORIES = new Set(['property_damage','threats_violence','theft_report','harassment','noise_disturbance','smoking','unauthorized_guests','payment_dispute','fraud_suspicion','security_intervention','other'])
const EVIDENCE_LEVELS = new Set(['observed','documented','reported'])
const MIME_EXT: Record<string,string> = {'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','text/plain':'.txt'}

function validateFileSignature(bytes: Buffer, mime: string) {
  if (mime === 'application/pdf') return bytes.subarray(0,5).toString() === '%PDF-'
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  if (mime === 'image/webp') return bytes.length >= 12 && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP'
  if (mime === 'text/plain') return !bytes.includes(0)
  return false
}

export async function POST(request: Request) {
  let createdIncidentId: string | null = null
  let uploadedPath: string | null = null
  let adminForCleanup: any = null
  try {
    const { admin, hotel, user } = await apiContext(request, WRITE_ROLES)
    adminForCleanup = admin
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification is required before processing guest network data.')
    const form = await request.formData()
    if (!form.get('attest')) throw new ApiError(400, 'Accuracy attestation is required')

    const guestId = requiredString(form.get('guestId'), 'Guest', 60)
    if (!await hasLocalGuestRelationship(admin, hotel.id, guestId)) throw new ApiError(409, 'Record the guest stay at this property before documenting an incident.')

    const severity = integerIn(form.get('severity'), 1, 4, 'Severity')
    const category = requiredString(form.get('category'), 'Category', 80)
    const evidenceLevel = requiredString(form.get('evidenceLevel'), 'Evidence level', 30)
    if (!CATEGORIES.has(category)) throw new ApiError(400, 'Invalid incident category')
    if (!EVIDENCE_LEVELS.has(evidenceLevel)) throw new ApiError(400, 'Invalid evidence level')

    const title = requiredString(form.get('title'), 'Title', 180)
    const description = requiredString(form.get('description'), 'Description', 5000)
    const occurredRaw = requiredString(form.get('occurredAt'), 'Occurred at', 40)
    const occurred = new Date(occurredRaw)
    if (Number.isNaN(occurred.getTime())) throw new ApiError(400, 'Occurred-at date is invalid')
    if (occurred.getTime() > Date.now() + 5 * 60_000) throw new ApiError(400, 'Incident time cannot be in the future')

    const stayId = optionalString(form.get('stayId'), 60)
    if (stayId) {
      const { data: stay } = await admin.from('stays').select('id').eq('id', stayId).eq('hotel_id', hotel.id).eq('guest_id', guestId).maybeSingle()
      if (!stay) throw new ApiError(400, 'Selected stay does not belong to this guest and property')
    }

    const status = severity >= 3 ? 'pending_review' : 'published'
    const { data: incident, error } = await admin.from('incidents').insert({
      hotel_id: hotel.id,
      guest_id: guestId,
      stay_id: stayId,
      category,
      severity,
      title_cipher: encryptPII(title),
      description_cipher: encryptPII(description),
      evidence_level: evidenceLevel,
      occurred_at: occurred.toISOString(),
      external_ref_cipher: encryptPII(optionalString(form.get('externalRef'), 200)),
      status,
      created_by: user.id,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }).select('id').single()
    if (error) throw error
    createdIncidentId = incident.id

    const file = form.get('evidence')
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) throw new ApiError(413, 'Evidence file exceeds 10 MB')
      if (!(file.type in MIME_EXT)) throw new ApiError(415, 'Unsupported evidence file type')
      const bytes = Buffer.from(await file.arrayBuffer())
      if (!validateFileSignature(bytes, file.type)) throw new ApiError(415, 'Evidence content does not match its declared file type')
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      const originalName = file.name.slice(-240) || `evidence${MIME_EXT[file.type]}`
      uploadedPath = `${hotel.id}/${incident.id}/${crypto.randomUUID()}${MIME_EXT[file.type]}`
      const up = await admin.storage.from('incident-evidence').upload(uploadedPath, bytes, { contentType: file.type, upsert: false })
      if (up.error) throw up.error
      const { error: fileError } = await admin.from('evidence_files').insert({ incident_id: incident.id, hotel_id: hotel.id, storage_path: uploadedPath, file_name_cipher: encryptPII(originalName), mime_type: file.type, size_bytes: file.size, sha256: hash, uploaded_by: user.id })
      if (fileError) throw fileError
    }

    await audit(admin, { hotelId: hotel.id, userId: user.id, action: status === 'published' ? 'incident_published' : 'incident_submitted_for_review', targetType: 'incident', targetId: incident.id, metadata: { guestId, severity, category, evidenceLevel, hasEvidence: Boolean(uploadedPath) } })
    return NextResponse.redirect(new URL(status === 'pending_review' ? '/moderation' : '/incidents', request.url), 303)
  } catch (e) {
    // Best-effort rollback for the DB + Storage sequence when evidence processing fails.
    if (adminForCleanup && uploadedPath) { try { await adminForCleanup.storage.from('incident-evidence').remove([uploadedPath]) } catch {} }
    if (adminForCleanup && createdIncidentId) { try { await adminForCleanup.from('incidents').delete().eq('id', createdIncidentId) } catch {} }
    return fail(e, request)
  }
}
