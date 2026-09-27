import { requireHotelContext, MANAGE_ROLES } from '@/lib/auth'
import { decryptPII } from '@/lib/crypto'

export default async function PrivacyCenter() {
  const { admin, hotel } = await requireHotelContext(MANAGE_ROLES)
  const [{ data: requests }, { data: profile }] = await Promise.all([
    admin.from('data_rights_requests').select('*').eq('source_hotel_id', hotel.id).order('created_at', { ascending: false }).limit(200),
    admin.from('hotel_compliance_profiles').select('*').eq('hotel_id', hotel.id).maybeSingle(),
  ])
  const reviewDate = profile?.last_legal_review_at ? String(profile.last_legal_review_at).slice(0, 10) : ''
  return <>
    <div className="topline"><div><span className="eyebrow">Privacy operations</span><h1>Privacy center</h1></div></div>

    <section className="card panel section">
      <h2>Property compliance record</h2>
      <div className="notice">This records the property's decisions and legal review. GuestAtlas does not decide whether a DPO, registration, regulator notification, or specific lawful basis is legally required.</div>
      <form action="/api/privacy/compliance" method="post" className="simpleForm">
        <label>Privacy contact email<input type="email" name="privacyContactEmail" defaultValue={profile?.privacy_contact_email || hotel.legal_contact_email || ''}/></label>
        <label>Breach/security contact email<input type="email" name="breachContactEmail" defaultValue={profile?.breach_contact_email || ''}/></label>
        <label>DPO / privacy officer name<input name="dpoName" maxLength={200} defaultValue={profile?.dpo_name || ''}/></label>
        <label>DPO / privacy officer email<input type="email" name="dpoEmail" defaultValue={profile?.dpo_email || ''}/></label>
        <label><input type="checkbox" name="dpoRequirementReviewed" value="true" defaultChecked={Boolean(profile?.dpo_requirement_reviewed)}/> DPO requirement has been reviewed for this property/operator</label>
        <label>Lawful basis / purpose notes<textarea name="lawfulBasisNotes" maxLength={5000} defaultValue={profile?.lawful_basis_notes || ''}/></label>
        <label>International transfer / processor notes<textarea name="internationalTransferNotes" maxLength={5000} defaultValue={profile?.international_transfer_notes || ''}/></label>
        <label>Privacy notice version<input name="privacyNoticeVersion" maxLength={100} defaultValue={profile?.privacy_notice_version || ''}/></label>
        <label>Terms version<input name="termsVersion" maxLength={100} defaultValue={profile?.terms_version || ''}/></label>
        <label>Last legal review<input type="date" name="lastLegalReviewAt" defaultValue={reviewDate}/></label>
        <button className="primary">Save compliance record</button>
      </form>
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
            <button className="secondary" name="status" value="identity_verified">Identity verified</button>
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
