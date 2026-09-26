'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { POLICY_VERSION } from '@/lib/public-config'

function enc(v: string) { return encodeURIComponent(v) }

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  if (!email || !password) redirect('/login?error=Email%20and%20password%20are%20required')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect('/login?error=Sign-in%20failed.%20Check%20your%20credentials%20or%20reset%20your%20password.')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const fullName = String(formData.get('fullName') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  if (!fullName || fullName.length > 120) redirect('/login?error=Enter%20your%20full%20name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/login?error=Enter%20a%20valid%20email')
  if (password.length < 12 || password.length > 128) redirect('/login?error=Password%20must%20be%2012-128%20characters')
  if (!formData.get('acceptTerms') || !formData.get('acceptPrivacy')) redirect('/login?error=Accept%20the%20Terms%20and%20Privacy%20Notice%20to%20create%20an%20account')

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const now = new Date().toISOString()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: fullName,
        terms_accepted_at: now,
        terms_version: POLICY_VERSION,
        privacy_acknowledged_at: now,
      },
    },
  })
  if (error) redirect(`/login?error=${enc('Account creation could not be completed. Check the details or contact support.')}`)
  redirect('/login?message=Check%20your%20email%20to%20confirm%20the%20account')
}
