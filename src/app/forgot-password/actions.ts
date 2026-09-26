'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const message = 'If an eligible account exists, a password reset link has been sent.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/forgot-password?message=${encodeURIComponent(message)}`)
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/recovery` })
  redirect(`/forgot-password?message=${encodeURIComponent(message)}`)
}
