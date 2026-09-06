import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type HotelRole = 'owner' | 'admin' | 'manager' | 'reviewer' | 'viewer'
export const WRITE_ROLES: HotelRole[] = ['owner', 'admin', 'manager', 'reviewer']
export const MANAGE_ROLES: HotelRole[] = ['owner', 'admin', 'manager']

export async function getVerifiedUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function requireUser() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login')
  return user
}

export async function getHotelContext(preferredHotelId?: string | null) {
  const user = await getVerifiedUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('hotel_memberships')
    .select('hotel_id, role, status, hotel:hotels(id,name,slug,status,city,country_code,verification_status,legal_entity_name,registration_number)')
    .eq('user_id', user.id)
    .eq('status', 'active')
  if (error) throw error
  const memberships = (data || []) as any[]
  if (!memberships.length) return { user, admin, memberships, membership: null, hotel: null }
  const cookieStore = await cookies()
  const cookieHotel = cookieStore.get('guestatlas_hotel')?.value
  const wanted = preferredHotelId || cookieHotel
  const membership = memberships.find(m => m.hotel_id === wanted) || memberships[0]
  return { user, admin, memberships, membership, hotel: membership.hotel }
}

export async function requireHotelContext(roleSet?: HotelRole[]) {
  const context = await getHotelContext()
  if (!context) redirect('/login')
  if (!context.hotel || !context.membership) redirect('/onboarding')
  if (roleSet && !roleSet.includes(context.membership.role as HotelRole)) redirect('/dashboard?error=permission')
  return context as NonNullable<typeof context> & { hotel: any; membership: any }
}

export async function isPlatformAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  return Boolean(data)
}

export async function hasRequiredMfa() {
  if ((process.env.REQUIRE_MFA || 'true').toLowerCase() === 'false') return true
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return false
  return data.currentLevel === 'aal2'
}

export async function requireMfa() {
  if (!await hasRequiredMfa()) redirect('/mfa')
}
