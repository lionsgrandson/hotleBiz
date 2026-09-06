import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireHotelContext } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { guestDisplay, getGuestReputation } from '@/lib/data'
import { ScoreCard } from '@/components/ScoreCard'
import { hasGuestAccess, hasLocalGuestRelationship } from '@/lib/access'
import { redirect } from 'next/navigation'
import { decryptPII } from '@/lib/crypto'

export default async function GuestPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{purpose?:string}> }) {
  const { id } = await params; const sp = await searchParams
  const { admin, hotel, user, membership } = await requireHotelContext()
  const canWrite=['owner','admin','manager','reviewer'].includes(membership.role); const canManage=['owner','admin','manager'].includes(membership.role)
  if (!await hasGuestAccess(admin, hotel.id, user.id, id)) redirect('/guests?error=access-expired')
  const localRelationship = await hasLocalGuestRelationship(admin, hotel.id, id)
  const { data: row } = await admin.from('guests').select('*').eq('id',id).maybeSingle(); if(!row) notFound()
  const purpose = sp.purpose || 'authorized guest record review'
  await audit(admin,{hotelId:hotel.id,userId:user.id,action:'guest_record_viewed',targetType:'guest',targetId:id,purpose})
  const g=guestDisplay(row); const rep=await getGuestReputation(admin,id)
  const [{data:stays},{data:feedback},{data:incidents},{data:identifiers}] = await Promise.all([
    admin.from('stays').select('id,hotel_id,reservation_ref_cipher,check_in,check_out,status').eq('guest_id',id).eq('hotel_id',hotel.id).order('check_in',{ascending:false}).limit(20),
    admin.from('stay_feedback').select('id,hotel_id,overall_score,summary_cipher,would_host_again,published_at,status,dispute_status').eq('guest_id',id).in('status',['published','under_review']).order('published_at',{ascending:false}).limit(20),
    admin.from('incidents').select('id,hotel_id,category,severity,title_cipher,description_cipher,occurred_at,status,dispute_status,evidence_level').eq('guest_id',id).in('status',['published','under_review']).order('occurred_at',{ascending:false}).limit(20),
    admin.from('guest_identifiers').select('identifier_type,masked_value').eq('guest_id',id)
  ])
  const visibleFeedback=(feedback||[]).filter((f:any)=>f.status==='published'||f.hotel_id===hotel.id)
  const visibleIncidents=(incidents||[]).filter((i:any)=>i.status==='published'||i.hotel_id===hotel.id)
  function source(hotelId:string){return hotelId===hotel.id?hotel.name:'Verified partner property'}
  return <><div className="topline"><div><span className="eyebrow">Guest record</span><h1>{g.legalName}</h1></div><div className="actions">{canWrite&&<Link className="secondary" href={`/stays/new?guest=${id}`}>Add stay</Link>}{canWrite&&localRelationship&&<Link className="primary" href={`/incidents/new?guest=${id}`}>Document incident</Link>}</div></div><div className="guestHero"><section className="card identity"><span className="eyebrow">Verified identity</span><h1>{g.legalName}</h1><dl><div><dt>Date of birth</dt><dd>{localRelationship?(g.dateOfBirth||'—'):(g.dateOfBirth?'Verified exact match':'—')}</dd></div><div><dt>Country</dt><dd>{g.countryCode||'—'}</dd></div><div><dt>Email</dt><dd>{localRelationship?(g.email||'—'):'Hidden across properties'}</dd></div><div><dt>Phone</dt><dd>{localRelationship?(g.phone||'—'):'Hidden across properties'}</dd></div><div><dt>Identifiers</dt><dd>{(identifiers||[]).map((x:any)=>`${x.identifier_type}: ${x.masked_value}`).join(', ')||'—'}</dd></div><div><dt>Status</dt><dd>{g.recordStatus}</dd></div></dl></section><ScoreCard reputation={rep}/></div><section className="card panel section"><span className="eyebrow">Your property</span><h2>Local stay history</h2><table className="table"><thead><tr><th>Property</th><th>Dates</th><th>Reservation</th><th>Status</th></tr></thead><tbody>{(stays||[]).map((s:any)=><tr key={s.id}><td>{source(s.hotel_id)}</td><td>{s.check_in} → {s.check_out}</td><td>{s.hotel_id===hotel.id?decryptPII(s.reservation_ref_cipher)||'—':'Hidden'}</td><td>{s.status}</td></tr>)}</tbody></table></section><section className="card panel section"><span className="eyebrow">Structured reviews</span><h2>Stay feedback</h2>{!visibleFeedback.length?<p className="empty">No visible feedback.</p>:<table className="table"><thead><tr><th>Property</th><th>Score</th><th>Summary</th><th>Rebook</th><th>Dispute</th></tr></thead><tbody>{visibleFeedback.map((f:any)=><tr key={f.id}><td>{source(f.hotel_id)}</td><td>{Math.round(Number(f.overall_score)*20)}/100</td><td>{decryptPII(f.summary_cipher)||'—'}</td><td>{f.would_host_again===null?'—':f.would_host_again?'Yes':'No'}</td><td>{f.dispute_status}</td></tr>)}</tbody></table>}</section><section className="card panel section"><div className="formHeading"><div><span className="eyebrow">Separate from score</span><h2>Safety & property incidents</h2></div>{canManage&&localRelationship&&<Link className="secondary" href={`/guest-access/${id}`}>Create guest access link</Link>}</div>{!visibleIncidents.length?<p className="empty">No published incidents.</p>:<table className="table"><thead><tr><th>Property</th><th>Incident</th><th>Severity</th><th>Evidence</th><th>Dispute</th></tr></thead><tbody>{visibleIncidents.map((i:any)=><tr key={i.id}><td>{source(i.hotel_id)}</td><td><strong>{decryptPII(i.title_cipher)}</strong><br/><span style={{color:'#66716c'}}>{i.category.replaceAll('_',' ')} · {decryptPII(i.description_cipher)}</span></td><td><span className={`badge ${i.severity>=3?'danger':i.severity===2?'warn':''}`}>{i.severity}/4</span></td><td>{i.evidence_level}</td><td>{i.dispute_status}</td></tr>)}</tbody></table>}</section></>
}
