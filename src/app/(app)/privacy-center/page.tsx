import { requireHotelContext, MANAGE_ROLES } from '@/lib/auth'
import { decryptPII } from '@/lib/crypto'

export default async function PrivacyCenter() {
  const { admin, hotel } = await requireHotelContext(MANAGE_ROLES)
  const [{ data: requests }, { data: profile }] = await Promise.all([
    admin.from('data_rights_requests').select('*').eq('source_hotel_id', hotel.id).order('created_at', { ascending: false }).limit(200),
    admin.from('hotel_compliance_profiles').select('*').eq('hotel_id', hotel.id).maybeSingle(),
  ])
  return <>
    <div className="topline"><div><span className="eyebrow">Privacy operations</span><h1>Privacy center</h1></div></div>
    <section className="card panel section">
      <h2>Property compliance record</h2>
      <p>Privacy contact: {profile?.privacy_contact_email || hotel.legal_contact_email || 'Not configured'}.</p>
      <p>DPO requirement reviewed: {profile?.dpo_requirement_reviewed ? 'Yes' : 'Not recorded'}.</p>
      <p>Last legal review: {profile?.last_legal_review_at ? new Date(profile.last_legal_review_at).toLocaleDateString() : 'Not recorded'}.</p>
      <div className="notice">These fields document compliance work; the software does not determine whether a DPO, database registration, regulator notification, or a particular lawful basis is legally required.</div>
    </section>
    <section className="card panel">
      <h2>Data-rights requests</h2>
      {!requests?.length ? <p className="empty">No privacy requests received.</p> :
      <table className="table"><thead><tr><th>Date</th><th>Type</th><th>Request</th><th>Internal target</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{requests.map((r:any)=><tr key={r.id}>
        <td>{new Date(r.created_at).toLocaleDateString()}</td>
        <td>{r.request_type}</td>
        <td>{decryptPII(r.message_cipher) || '—'}</td>
        <td>{new Date(r.internal_target_at).toLocaleDateString()}</td>
        <td>{r.status}</td>
        <td><form action="/api/privacy/requests" method="post" style={{display:'grid',gap:6}}>
          <input type="hidden" name="requestId" value={r.id}/>
          <textarea name="response" placeholder="Document response / rationale" defaultValue={decryptPII(r.response_cipher) || ''}/>
          <div className="actions">
            <button className="secondary" name="status" value="in_progress">In progress</button>
            <button className="primary" name="status" value="completed">Complete</button>
            <button className="secondary" name="status" value="partially_completed">Partial</button>
            <button className="secondary" name="status" value="rejected">Reject</button>
          </div>
        </form></td>
      </tr>)}</tbody></table>}
    </section>
  </>
}
