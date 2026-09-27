'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 12) redirect('/reset-password?error=Password%20must%20be%20at%20least%2012%20characters')
  if (password !== confirm) redirect('/reset-password?error=Passwords%20do%20not%20match')
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login?error=Reset%20session%20expired.%20Request%20a%20new%20reset%20link.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  await supabase.auth.signOut()
  redirect('/login?message=Password%20updated.%20Sign%20in%20again%20and%20complete%20MFA.')
}
