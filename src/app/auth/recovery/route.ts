import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const supabase = await createClient()
  let error: any = null

  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code))
  else if (tokenHash) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }))
  else return NextResponse.redirect(new URL('/forgot-password?message=Reset%20link%20is%20invalid%20or%20expired', request.url))

  if (error) return NextResponse.redirect(new URL('/forgot-password?message=Reset%20link%20is%20invalid%20or%20expired', request.url))
  return NextResponse.redirect(new URL('/reset-password', request.url))
}
