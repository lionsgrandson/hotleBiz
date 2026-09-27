import { requireHotelContext, MANAGE_ROLES } from '@/lib/auth'
import { hasLocalGuestRelationship } from '@/lib/access'
import { redirect } from 'next/navigation'

export default async function GuestAccess({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{link?:string}>}){
  const{id}=await params
  const sp=await searchParams
  const{admin,hotel}=await requireHotelContext(MANAGE_ROLES)
  if(!await hasLocalGuestRelationship(admin,hotel.id,id))redirect(`/guests/${id}?error=local-relationship-required`)
  const {data:tokens}=await admin.from('guest_portal_tokens')
    .select('id,created_at,expires_at,revoked_at,first_accessed_at,last_accessed_at,access_count')
    .eq('guest_id',id).eq('source_hotel_id',hotel.id).order('created_at',{ascending:false}).limit(25)

  return <>
    <div className="topline"><div><span className="eyebrow">Guest rights portal</span><h1>Guest access</h1></div></div>
    <section className="card simpleForm">
      <div className="notice">Links expire after 30 days and expose the guest's published network record, data export and privacy/dispute controls. Send a link only after verifying the recipient is the guest.</div>
      {sp.link?<label>New guest access URL<input readOnly value={sp.link}/></label>:<form action="/api/guest-access" method="post"><input type="hidden" name="guestId" value={id}/><button className="primary">Create 30-day access link</button></form>}
    </section>
    <section className="card panel section">
      <h2>Issued access links</h2>
      {!tokens?.length?<p className="empty">No links issued.</p>:<table className="table"><thead><tr><th>Created</th><th>Expires</th><th>Use</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {tokens.map((t:any)=>{const active=!t.revoked_at && new Date(t.expires_at).getTime()>Date.now();return <tr key={t.id}>
          <td>{new Date(t.created_at).toLocaleString()}</td><td>{new Date(t.expires_at).toLocaleString()}</td>
          <td>{t.access_count||0} views{t.last_accessed_at?` · last ${new Date(t.last_accessed_at).toLocaleString()}`:''}</td>
          <td>{t.revoked_at?'Revoked':active?'Active':'Expired'}</td>
          <td>{active?<form action="/api/guest-access/revoke" method="post"><input type="hidden" name="tokenId" value={t.id}/><input type="hidden" name="guestId" value={id}/><button className="secondary">Revoke</button></form>:'—'}</td>
        </tr>})}
      </tbody></table>}
    </section>
  </>
}
