import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash } from '@/lib/crypto'
import { notFound } from 'next/navigation'

export const metadata:Metadata={robots:{index:false,follow:false}}

export default async function Join({params}:{params:Promise<{token:string}>}){
  const user=await requireUser();const{token}=await params;const admin=createAdminClient()
  const{data:invite}=await admin.from('hotel_invites').select('id,email,role,expires_at,hotel:hotels(name)').eq('token_hash',tokenHash(token)).gt('expires_at',new Date().toISOString()).is('accepted_at',null).is('revoked_at',null).maybeSingle()
  if(!invite||!user.email||user.email.toLowerCase()!==invite.email.toLowerCase())notFound()
  return <main className="loginPanel" style={{minHeight:'100vh'}}><form className="card loginBox" action="/api/join" method="post"><span className="eyebrow">Property invitation</span><h2>Join {(invite.hotel as any)?.name||'property'}</h2><p>You were invited as <strong>{invite.role}</strong>. Accepting adds your verified account to this property and means your use is subject to the <Link href="/terms">Network Terms</Link> and <Link href="/acceptable-use">Acceptable Use Policy</Link>.</p><input type="hidden" name="token" value={token}/><button className="primary">Accept invitation</button></form></main>
}
