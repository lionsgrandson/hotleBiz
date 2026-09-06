import { decryptPII } from '@/lib/crypto'
import { calculateReputation } from '@/lib/scoring'
import type { SupabaseClient } from '@supabase/supabase-js'

export function guestDisplay(row: any) {
  return {
    id: row.id,
    legalName: decryptPII(row.legal_name_cipher) || 'Guest',
    dateOfBirth: decryptPII(row.dob_cipher),
    email: decryptPII(row.email_cipher),
    phone: decryptPII(row.phone_cipher),
    countryCode: row.country_code,
    createdAt: row.created_at,
    recordStatus: row.record_status,
  }
}

export async function getGuestReputation(admin: SupabaseClient, guestId: string) {
  const [{ data: reviews, error: reviewsError }, { data: incidents, error: incidentsError }] = await Promise.all([
    admin.from('stay_feedback').select('cleanliness,property_care,staff_respect,noise,payment,policy_compliance,would_host_again').eq('guest_id', guestId).eq('status', 'published'),
    admin.from('incidents').select('id,severity,status,dispute_status').eq('guest_id', guestId).in('status', ['published', 'under_review']),
  ])
  if (reviewsError) throw reviewsError
  if (incidentsError) throw incidentsError
  const score = calculateReputation((reviews || []) as any[])
  const activeIncidents = (incidents || []).filter((i: any) => i.status === 'published')
  return {
    ...score,
    incidents: {
      total: activeIncidents.length,
      serious: activeIncidents.filter((i: any) => i.severity >= 3).length,
    },
  }
}
