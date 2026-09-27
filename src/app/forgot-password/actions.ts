'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!email) redirect('/forgot-password?error=Email%20is%20required')
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })
  if (error) console.error('Password reset request failed:', error.message)
  redirect('/forgot-password?message=If%20the%20account%20exists%2C%20a%20reset%20email%20has%20been%20sent')
}
