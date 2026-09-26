import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser, isPlatformAdmin, requireMfa } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Platform administration',robots:{index:false,follow:false,nocache:true}}

export default async function Platform(){
  await requireMfa();const user=await requireUser();if(!await isPlatformAdmin(user.id))redirect('/dashboard?error=permission')
  const admin=createAdminClient()
  const[{data:hotels},{count:guests},{count:searches},{count:disputes}]=await Promise.all([
    admin.from('hotels').select('id,name,legal_entity_name,registration_number,city,country_code,legal_contact_email,verification_status,verification_notes,created_at,verification_files:hotel_verification_files(id,document_type,created_at)').order('created_at',{ascending:false}),
    admin.from('guests').select('*',{count:'exact',head:true}),
    admin.from('audit_logs').select('*',{count:'exact',head:true}).eq('action','guest_network_search_requested'),
    admin.from('disputes').select('*',{count:'exact',head:true}).in('status',['pending','reviewing'])
  ])
  return <main className="legal" style={{maxWidth:1300}}><span className="eyebrow">Network governance</span><h1>Platform administration</h1><section className="metricGrid"><div className="card metric"><span>Properties</span><strong>{hotels?.length||0}</strong></div><div className="card metric"><span>Guest records</span><strong>{guests||0}</strong></div><div className="card metric"><span>Audited searches</span><strong>{searches||0}</strong></div><div className="card metric"><span>Open disputes</span><strong>{disputes||0}</strong></div></section><section className="card panel section"><h2>Property verification</h2><div className="notice">Verification must be based on a documented check. Notes should state the source/method and result, not copy unnecessary personal information.</div><table className="table"><thead><tr><th>Property</th><th>Legal entity</th><th>Registration</th><th>Documents</th><th>Status</th><th>Decision</th></tr></thead><tbody>{(hotels||[]).map((h:any)=><tr key={h.id}><td><strong>{h.name}</strong><br/>{h.city}, {h.country_code}<br/><small>{h.legal_contact_email}</small></td><td>{h.legal_entity_name||'—'}</td><td>{h.registration_number||'—'}</td><td>{h.verification_files?.length? h.verification_files.map((f:any)=><div key={f.id}><a href={`/api/verification/${f.id}`}>{f.document_type.replaceAll('_',' ')}</a></div>):'None uploaded'}</td><td>{h.verification_status}{h.verification_notes?<><br/><small>{h.verification_notes}</small></>:null}</td><td><form action="/api/platform/hotels" method="post" style={{display:'grid',gap:7,minWidth:220}}><input type="hidden" name="hotelId" value={h.id}/><textarea name="notes" maxLength={1000} placeholder="Verification source / method / reason" required/><div className="actions"><button className="primary" name="decision" value="verified">Verify</button><button className="dangerBtn" name="decision" value="rejected">Reject</button><button className="secondary" name="decision" value="suspended">Suspend</button></div></form></td></tr>)}</tbody></table></section><p><a href="/dashboard">← Back to property</a></p></main>
}
