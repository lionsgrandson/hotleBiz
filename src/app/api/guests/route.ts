import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString, optionalString, isoDate } from '@/lib/http'
import { encryptPII, hmacMatch, maskIdentifier, normalizeDocument, normalizeEmail, normalizePhone, normalizeText } from '@/lib/crypto'
import { audit } from '@/lib/audit'
import { WRITE_ROLES } from '@/lib/auth'
import { grantGuestAccess } from '@/lib/access'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request, WRITE_ROLES)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Property verification is required before processing guest network data.')
    const b = await body(request)
    const fullName = requiredString(b.fullName, 'Full legal name', 200)
    const dob = isoDate(b.dateOfBirth, 'Date of birth')
    const purpose = requiredString(b.purpose, 'Purpose', 300)
    const email = optionalString(b.email, 320)
    const phone = optionalString(b.phone, 80)
    const document = optionalString(b.document, 100)
    const countryCode = optionalString(b.countryCode, 2)?.toUpperCase() || null
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) throw new ApiError(400, 'Country code must contain exactly two letters')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Email address is invalid')
    if (!email && !phone && !document) throw new ApiError(400, 'At least one strong identifier (document, email, or phone) is required.')

    const nameDobHash = hmacMatch('name_dob', `${normalizeText(fullName)}|${dob}`)
    const identifiers: { type: string; hash: string; masked: string }[] = [{ type: 'name_dob', hash: nameDobHash, masked: 'name + DOB' }]
    if (document) identifiers.push({ type: String(b.documentType) === 'national_id' ? 'national_id' : 'passport', hash: hmacMatch('document', normalizeDocument(document)), masked: maskIdentifier(document) })
    if (email) identifiers.push({ type: 'email', hash: hmacMatch('email', normalizeEmail(email)), masked: email.replace(/^(.).+(@.+)$/, '$1***$2') })
    if (phone) identifiers.push({ type: 'phone', hash: hmacMatch('phone', normalizePhone(phone)), masked: maskIdentifier(phone) })

    let existingId: string | null = null
    const documentIdentifier = identifiers.find(i => i.type === 'passport' || i.type === 'national_id')

    // A government/travel document is strong enough to merge by itself.
    if (documentIdentifier) {
      const { data, error } = await admin.from('guest_identifiers').select('guest_id').eq('identifier_hmac', documentIdentifier.hash).limit(1).maybeSingle()
      if (error) throw error
      if (data) existingId = data.guest_id
    }

    // Email/phone alone never auto-merges people. It must agree with exact name + DOB.
    if (!existingId) {
      const { data: nameRows, error: nameError } = await admin.from('guest_identifiers').select('guest_id').eq('identifier_hmac', nameDobHash)
      if (nameError) throw nameError
      const nameIds = new Set((nameRows || []).map((r: any) => r.guest_id))
      for (const x of identifiers.filter(i => ['email', 'phone'].includes(i.type))) {
        const { data: contactRows, error: contactError } = await admin.from('guest_identifiers').select('guest_id').eq('identifier_hmac', x.hash)
        if (contactError) throw contactError
        const agreed = (contactRows || []).find((r: any) => nameIds.has(r.guest_id))
        if (agreed) { existingId = agreed.guest_id; break }
      }
    }

    let guestId = existingId
    let createdNew = false
    if (!guestId) {
      const { data: g, error } = await admin.from('guests').insert({
        legal_name_cipher: encryptPII(fullName), dob_cipher: encryptPII(dob), email_cipher: encryptPII(email), phone_cipher: encryptPII(phone),
        country_code: countryCode, created_by_hotel_id: hotel.id, created_by: user.id,
      }).select('id').single()
      if (error) throw error
      guestId = g.id
      createdNew = true

      const { error: idError } = await admin.from('guest_identifiers').insert(identifiers.map(x => ({ guest_id: guestId, identifier_type: x.type, identifier_hmac: x.hash, masked_value: x.masked, created_by: user.id })))
      if (idError) {
        // A concurrent request may have inserted the same unique document after our lookup.
        // Remove the orphan guest and resolve the winner deterministically.
        await admin.from('guests').delete().eq('id', guestId)
        if (idError.code === '23505' && documentIdentifier) {
          const { data: winner, error: winnerError } = await admin.from('guest_identifiers').select('guest_id').eq('identifier_hmac', documentIdentifier.hash).limit(1).maybeSingle()
          if (winnerError) throw winnerError
          if (winner?.guest_id) { guestId = winner.guest_id; existingId = winner.guest_id; createdNew = false }
          else throw idError
        } else throw idError
      }
    }

    // Once identity has been strongly resolved, enrich the shared match index with any newly supplied exact identifiers.
    if (!createdNew && guestId) {
      const hashes = identifiers.map(i => i.hash)
      const { data: knownRows, error: knownError } = await admin.from('guest_identifiers').select('identifier_hmac').eq('guest_id', guestId).in('identifier_hmac', hashes)
      if (knownError) throw knownError
      const known = new Set((knownRows || []).map((r: any) => r.identifier_hmac))
      const missing = identifiers.filter(i => !known.has(i.hash))
      if (missing.length) {
        const { error: enrichError } = await admin.from('guest_identifiers').insert(missing.map(x => ({ guest_id: guestId, identifier_type: x.type, identifier_hmac: x.hash, masked_value: x.masked, created_by: user.id })))
        if (enrichError?.code === '23505') throw new ApiError(409, 'One supplied identity document already belongs to a different guest record. Resolve the identity conflict before continuing.')
        if (enrichError) throw enrichError
      }
    }

    const { error: linkError } = await admin.from('guest_hotel_links').upsert({ guest_id: guestId, hotel_id: hotel.id, relationship_status: 'active' }, { onConflict: 'guest_id,hotel_id' })
    if (linkError) throw linkError
    await grantGuestAccess(admin, hotel.id, user.id, [guestId], purpose)
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: existingId ? 'guest_linked_existing' : 'guest_created', targetType: 'guest', targetId: guestId, purpose })
    return NextResponse.redirect(new URL(`/guests/${guestId}?purpose=${encodeURIComponent(purpose)}`, request.url), 303)
  } catch (e) { return fail(e, request) }
}
