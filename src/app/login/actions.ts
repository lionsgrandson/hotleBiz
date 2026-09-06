'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function enc(v: string) { return encodeURIComponent(v) }
export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${enc(error.message)}`)
  redirect('/dashboard')
}
export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  if (password.length < 10) redirect('/login?error=Password%20must%20be%20at%20least%2010%20characters')
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/confirm` } })
  if (error) redirect(`/login?error=${enc(error.message)}`)
  redirect('/login?message=Check%20your%20email%20to%20confirm%20the%20account')
}
