import { apiContext, body, fail, ok, ApiError, requiredString, isoDate } from '@/lib/http'
import { hmacMatch, normalizeDocument, normalizeEmail, normalizePhone, normalizeText } from '@/lib/crypto'
import { guestDisplay, getGuestReputation } from '@/lib/data'
import { audit } from '@/lib/audit'
import { grantGuestAccess } from '@/lib/access'

export async function POST(request: Request) {
  try {
    const { admin, hotel, user } = await apiContext(request)
    if (hotel.verification_status !== 'verified') throw new ApiError(403, 'Network lookup is available after the property is verified by GuestAtlas.')
    const b = await body(request)
    const purpose = requiredString(b.purpose, 'Business purpose', 300)
    if (purpose.length < 8) throw new ApiError(400, 'Business purpose must be specific enough to audit')
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    const { count, error: countError } = await admin.from('audit_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', 'guest_network_search_requested').gte('created_at', today.toISOString())
    if (countError) throw countError
    if ((count || 0) >= 100) throw new ApiError(429, 'Daily lookup limit reached. Contact a platform administrator if this is operationally necessary.')

    const terms: { type: string; hash: string }[] = []
    if (typeof b.document === 'string' && b.document.trim()) terms.push({ type: 'document', hash: hmacMatch('document', normalizeDocument(b.document)) })
    if (typeof b.email === 'string' && b.email.trim()) terms.push({ type: 'email', hash: hmacMatch('email', normalizeEmail(b.email)) })
    if (typeof b.phone === 'string' && b.phone.trim()) terms.push({ type: 'phone', hash: hmacMatch('phone', normalizePhone(b.phone)) })
    if (typeof b.fullName === 'string' && b.fullName.trim() && typeof b.dateOfBirth === 'string' && b.dateOfBirth) { const dob = isoDate(b.dateOfBirth, 'Date of birth'); terms.push({ type: 'name_dob', hash: hmacMatch('name_dob', `${normalizeText(b.fullName)}|${dob}`) }) }
    if (!terms.length) throw new ApiError(400, 'Use a passport/ID, email, phone, or full name plus date of birth. Name-only searching is intentionally disabled.')

    // Write the access-attempt audit entry before touching network identity indexes.
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'guest_network_search_requested', targetType: 'guest_search', purpose, metadata: { matchTypes: terms.map(t => t.type) } })

    // Every supplied identifier must point at the same guest. This avoids accidental OR matches.
    let candidateIds: Set<string> | null = null
    for (const t of terms) {
      const { data, error } = await admin.from('guest_identifiers').select('guest_id').eq('identifier_hmac', t.hash)
      if (error) throw error
      const thisSet = new Set((data || []).map((r: any) => r.guest_id as string))
      candidateIds = candidateIds === null ? thisSet : new Set([...candidateIds].filter(id => thisSet.has(id)))
    }
    const guestIds = [...(candidateIds || new Set<string>())].slice(0, 20)
    const { data: guests, error: guestError } = guestIds.length ? await admin.from('guests').select('*').in('id', guestIds) : { data: [] as any[], error: null }
    if (guestError) throw guestError

    await grantGuestAccess(admin, hotel.id, user.id, guestIds, purpose)
    const results = []
    for (const row of guests || []) {
      const g = guestDisplay(row)
      const [{ data: identifiers }, reputation] = await Promise.all([
        admin.from('guest_identifiers').select('identifier_type,masked_value').eq('guest_id', row.id),
        getGuestReputation(admin, row.id),
      ])
      // Minimum necessary disclosure in search response. Full decrypted PII is only returned on an authorized record page.
      results.push({ id: g.id, legalName: g.legalName, countryCode: g.countryCode, identifiers: (identifiers || []).map((x: any) => `${x.identifier_type} ${x.masked_value}`), reputation })
    }
    await audit(admin, { hotelId: hotel.id, userId: user.id, action: 'guest_network_search_completed', targetType: 'guest_search', purpose, metadata: { matchCount: results.length, matchTypes: terms.map(t => t.type) } })
    return ok({ results })
  } catch (e) { return fail(e, request) }
}
