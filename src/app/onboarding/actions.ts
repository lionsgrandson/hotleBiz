'use server'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMfa, requireUser } from '@/lib/auth'
import { POLICY_VERSION } from '@/lib/public-config'

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'property'
}

export async function createHotel(formData: FormData) {
  await requireMfa()
  const user = await requireUser()
  for (const field of ['authority','legalBasis','accuracy','terms']) if (!formData.get(field)) redirect('/onboarding?error=legal')

  const name = String(formData.get('name') || '').trim()
  const legalEntityName = String(formData.get('legalEntityName') || '').trim()
  const registrationNumber = String(formData.get('registrationNumber') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const countryCode = String(formData.get('countryCode') || '').trim().toUpperCase()
  const legalEmail = String(formData.get('legalEmail') || '').trim().toLowerCase()
  if (!name || name.length>160 || !legalEntityName || legalEntityName.length>200 || !registrationNumber || registrationNumber.length>100 || !city || city.length>120 || !/^[A-Z]{2}$/.test(countryCode) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalEmail)) redirect('/onboarding?error=fields')

  const admin = createAdminClient()
  const slug = `${slugify(name)}-${randomUUID().slice(0, 8)}`
  const { data: hotelId, error } = await admin.rpc('create_hotel_workspace', {
    p_user_id: user.id,
    p_name: name,
    p_slug: slug,
    p_legal_entity_name: legalEntityName,
    p_registration_number: registrationNumber,
    p_city: city,
    p_country_code: countryCode,
    p_legal_contact_email: legalEmail,
  })
  if (error || !hotelId) {
    console.error('Property onboarding failed:', error)
    redirect('/onboarding?error=save')
  }
  const now=new Date().toISOString()
  const { error: policyError }=await admin.from('hotels').update({
    network_terms_version: POLICY_VERSION,
    privacy_notice_version: POLICY_VERSION,
    terms_accepted_at: now,
    data_controller_confirmed_at: now,
  }).eq('id',hotelId)
  if(policyError){
    console.error('Property policy acknowledgement save failed:',policyError)
    redirect('/onboarding?error=save')
  }
  redirect('/dashboard')
}
