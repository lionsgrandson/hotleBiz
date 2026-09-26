import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash, decryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'
import { GuestPortalBootstrap } from '@/components/GuestPortalBootstrap'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Private guest record',robots:{index:false,follow:false,nocache:true}}

function scoreRow(label:string,value:unknown){return <div><dt>{label}</dt><dd>{value?String(value)+'/5':'—'}</dd></div>}
function safeDecrypt(value:unknown){try{return typeof value==='string'&&value?decryptPII(value)||'—':'—'}catch{return '—'}}

export default async function GuestPortal({searchParams}:{searchParams:Promise<{submitted?:string;error?:string}>}){
  const status=await searchParams
  const store=await cookies()
  const token=store.get('guestatlas_guest_access')?.value
  if(!token)return <GuestPortalBootstrap/>

  const admin=createAdminClient()
  const{data:portalToken,error:tokenError}=await admin.from('guest_portal_tokens').select('*').eq('token_hash',tokenHash(token)).gt('expires_at',new Date().toISOString()).is('revoked_at',null).maybeSingle()
  if(tokenError)throw tokenError
  if(!portalToken)return <GuestPortalBootstrap/>

  await audit(admin,{hotelId:portalToken.source_hotel_id,userId:null,action:'guest_portal_viewed',targetType:'guest',targetId:portalToken.guest_id,purpose:'guest personal data access'})

  const[guestResult,identifierResult,stayResult,feedbackResult,incidentResult,disputeResult]=await Promise.all([
    admin.from('guests').select('*').eq('id',portalToken.guest_id).single(),
    admin.from('guest_identifiers').select('id,identifier_type,masked_value,created_at').eq('guest_id',portalToken.guest_id).order('created_at'),
    admin.from('stays').select('id,check_in,check_out,status,reservation_ref_cipher,room_ref_cipher,hotel:hotels(name)').eq('guest_id',portalToken.guest_id).order('check_in',{ascending:false}).limit(250),
    admin.from('stay_feedback').select('id,cleanliness,property_care,staff_respect,noise,payment,policy_compliance,overall_score,summary_cipher,would_host_again,published_at,status,dispute_status,hotel_id,hotel:hotels(name)').eq('guest_id',portalToken.guest_id).in('status',['published','under_review']).order('published_at',{ascending:false}),
    admin.from('incidents').select('id,category,severity,title_cipher,description_cipher,occurred_at,status,dispute_status,evidence_level,hotel_id,hotel:hotels(name)').eq('guest_id',portalToken.guest_id).in('status',['published','under_review']).order('occurred_at',{ascending:false}),
    admin.from('disputes').select('id,incident_id,feedback_id,status,response_cipher,created_at,resolved_at').eq('guest_id',portalToken.guest_id).order('created_at',{ascending:false}),
  ])
  for(const r of [guestResult,identifierResult,stayResult,feedbackResult,incidentResult,disputeResult])if(r.error)throw r.error

  const guest=guestResult.data
  const identifiers=identifierResult.data||[]
  const stays=stayResult.data||[]
  const feedback=feedbackResult.data||[]
  const incidents=incidentResult.data||[]
  const disputes=disputeResult.data||[]
  const latestFor=(kind:'incident'|'feedback',id:string)=>disputes.find((d:any)=>kind==='incident'?d.incident_id===id:d.feedback_id===id)

  return <main className="legal">
    <div className="topline"><div><span className="eyebrow">GuestAtlas personal data access</span><h1>{safeDecrypt(guest.legal_name_cipher)}</h1></div><form action="/api/guest-portal/logout" method="post"><button className="secondary">End private session</button></form></div>
    <p>This private page shows the core personal information and network records connected to your matched GuestAtlas record. Raw evidence files and information that may identify or affect the rights/security of another person are not automatically disclosed here; you can request additional access through the privacy channel where applicable.</p>
    {status.submitted==='1'&&<p className="notice" role="status">Your challenge / correction request was submitted. The challenged adverse record is under review.</p>}
    {status.error&&<p className="error" role="alert">{status.error}</p>}

    <section className="card panel section"><h2>Identity and contact data</h2><dl className="settingsFacts"><div><dt>Legal name</dt><dd>{safeDecrypt(guest.legal_name_cipher)}</dd></div><div><dt>Date of birth</dt><dd>{safeDecrypt(guest.dob_cipher)}</dd></div><div><dt>Email</dt><dd>{safeDecrypt(guest.email_cipher)}</dd></div><div><dt>Phone</dt><dd>{safeDecrypt(guest.phone_cipher)}</dd></div><div><dt>Country</dt><dd>{guest.country_code||'—'}</dd></div><div><dt>Record status</dt><dd>{guest.record_status}</dd></div></dl><h3>Matching identifiers</h3>{!identifiers.length?<p>No additional matching identifiers.</p>:<table className="table"><thead><tr><th>Type</th><th>Stored display</th></tr></thead><tbody>{identifiers.map((i:any)=><tr key={i.id}><td>{i.identifier_type.replaceAll('_',' ')}</td><td>{i.masked_value}</td></tr>)}</tbody></table>}</section>

    <section className="card panel section"><h2>Stay records</h2>{!stays.length?<p>No stay records.</p>:<table className="table"><thead><tr><th>Property</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>References</th></tr></thead><tbody>{stays.map((s:any)=><tr key={s.id}><td>{(s.hotel as any)?.name||'Participating property'}</td><td>{s.check_in}</td><td>{s.check_out}</td><td>{s.status}</td><td>{safeDecrypt(s.reservation_ref_cipher)} / {safeDecrypt(s.room_ref_cipher)}</td></tr>)}</tbody></table>}</section>

    <h2>Stay feedback</h2>
    {!feedback.length?<p>No visible feedback.</p>:feedback.map((x:any)=>{
      const d=latestFor('feedback',x.id),open=d&&['pending','reviewing'].includes(d.status)
      return <section className="card panel section" key={x.id}><span className="eyebrow">Source property: {(x.hotel as any)?.name||'Participating property'} · {x.published_at?new Date(x.published_at).toLocaleDateString():'date unavailable'}</span><h2>Overall score {Math.round(Number(x.overall_score)*20)}/100</h2><dl className="settingsFacts">{scoreRow('Cleanliness',x.cleanliness)}{scoreRow('Property care',x.property_care)}{scoreRow('Staff respect',x.staff_respect)}{scoreRow('Noise',x.noise)}{scoreRow('Payment',x.payment)}{scoreRow('Policy compliance',x.policy_compliance)}</dl><p>Would host again: {x.would_host_again===null?'not recorded':x.would_host_again?'yes':'no'}.</p><p>{safeDecrypt(x.summary_cipher)}</p><p>Record status: {x.status}. Dispute status: {x.dispute_status}.</p>{d?.response_cipher&&<div className="notice"><strong>Latest property response:</strong> {safeDecrypt(d.response_cipher)}</div>}{open?<p className="notice">A request for this record is already under review.</p>:<form action="/api/guest-portal/dispute" method="post" className="simpleForm" style={{padding:0}}><input type="hidden" name="feedbackId" value={x.id}/><label>Challenge / correction request<textarea name="message" maxLength={3000} required/></label><button className="secondary">Submit request</button></form>}</section>
    })}

    <h2>Incidents</h2>
    {!incidents.length?<p>No published incidents.</p>:incidents.map((x:any)=>{
      const d=latestFor('incident',x.id),open=d&&['pending','reviewing'].includes(d.status)
      return <section className="card panel section" key={x.id}><span className="eyebrow">Source property: {(x.hotel as any)?.name||'Participating property'} · {new Date(x.occurred_at).toLocaleDateString()}</span><div><span className={`badge ${x.severity>=3?'danger':'warn'}`}>Severity {x.severity}/4</span></div><h2>{safeDecrypt(x.title_cipher)}</h2><p>{safeDecrypt(x.description_cipher)}</p><p>Evidence status: {x.evidence_level}. Record status: {x.status}. Dispute status: {x.dispute_status}.</p>{d?.response_cipher&&<div className="notice"><strong>Latest property response:</strong> {safeDecrypt(d.response_cipher)}</div>}{open?<p className="notice">A request for this record is already under review.</p>:<form action="/api/guest-portal/dispute" method="post" className="simpleForm" style={{padding:0}}><input type="hidden" name="incidentId" value={x.id}/><label>Challenge / correction request<textarea name="message" maxLength={3000} required/></label><button className="secondary">Submit request</button></form>}</section>
    })}
  </main>
}
