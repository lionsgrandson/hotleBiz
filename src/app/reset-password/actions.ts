'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 12 || password.length > 128) redirect('/reset-password?error=Password%20must%20be%2012-128%20characters')
  if (password !== confirm) redirect('/reset-password?error=Passwords%20do%20not%20match')

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/forgot-password?message=Reset%20session%20expired.%20Request%20a%20new%20link.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect('/reset-password?error=Password%20could%20not%20be%20updated.%20Request%20a%20new%20link.')
  await supabase.auth.signOut()
  redirect('/login?message=Password%20updated.%20Sign%20in%20again%20and%20complete%20MFA.')
}
