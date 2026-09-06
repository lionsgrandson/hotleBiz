'use server'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMfa, requireUser } from '@/lib/auth'

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'property'
}

export async function createHotel(formData: FormData) {
  await requireMfa()
  const user = await requireUser()
  if (!formData.get('legalBasis')) redirect('/onboarding?error=legal')

  const name = String(formData.get('name') || '').trim()
  const legalEntityName = String(formData.get('legalEntityName') || '').trim()
  const registrationNumber = String(formData.get('registrationNumber') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const countryCode = String(formData.get('countryCode') || '').trim().toUpperCase()
  const legalEmail = String(formData.get('legalEmail') || '').trim().toLowerCase()
  if (!name || !legalEntityName || !registrationNumber || !city || !/^[A-Z]{2}$/.test(countryCode) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalEmail)) redirect('/onboarding?error=fields')

  const admin = createAdminClient()
  const slug = `${slugify(name)}-${randomUUID().slice(0, 8)}`
  const { error } = await admin.rpc('create_hotel_workspace', {
    p_user_id: user.id,
    p_name: name,
    p_slug: slug,
    p_legal_entity_name: legalEntityName,
    p_registration_number: registrationNumber,
    p_city: city,
    p_country_code: countryCode,
    p_legal_contact_email: legalEmail,
  })
  if (error) {
    console.error('Property onboarding failed:', error)
    redirect('/onboarding?error=save')
  }
  redirect('/dashboard')
}
