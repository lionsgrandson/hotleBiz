import type { SupabaseClient } from '@supabase/supabase-js'

export async function hasLocalGuestRelationship(admin: SupabaseClient, hotelId: string, guestId: string) {
  const { data, error } = await admin.from('guest_hotel_links').select('guest_id').eq('hotel_id', hotelId).eq('guest_id', guestId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function hasGuestAccess(admin: SupabaseClient, hotelId: string, userId: string, guestId: string) {
  if (await hasLocalGuestRelationship(admin, hotelId, guestId)) return true
  const { data, error } = await admin.from('guest_access_grants').select('guest_id').eq('hotel_id', hotelId).eq('user_id', userId).eq('guest_id', guestId).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function grantGuestAccess(admin: SupabaseClient, hotelId: string, userId: string, guestIds: string[], purpose: string, minutes = 15) {
  if (!guestIds.length) return
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString()
  const rows = guestIds.map(guestId => ({ guest_id: guestId, hotel_id: hotelId, user_id: userId, purpose, expires_at: expiresAt }))
  const { error } = await admin.from('guest_access_grants').upsert(rows, { onConflict: 'guest_id,hotel_id,user_id' })
  if (error) throw error
}
