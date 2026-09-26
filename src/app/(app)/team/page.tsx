import { requireHotelContext, MANAGE_ROLES } from '@/lib/auth'
import { TeamInviteCreator } from '@/components/TeamInviteCreator'

export default async function Team(){
  const{admin,hotel}=await requireHotelContext(MANAGE_ROLES)
  const [{data:members},{data:invites}]=await Promise.all([
    admin.from('hotel_memberships').select('id,user_id,role,status,created_at,profile:profiles(full_name,email)').eq('hotel_id',hotel.id).order('created_at'),
    admin.from('hotel_invites').select('id,email,role,expires_at,created_at').eq('hotel_id',hotel.id).is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
  ])
  return <><div className="topline"><div><span className="eyebrow">Least privilege</span><h1>Property team</h1></div></div>
  <section className="dashboardGrid"><div className="card panel"><h2>Members</h2><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Manage</th></tr></thead><tbody>{(members||[]).map((m:any)=><tr key={m.id}><td>{m.profile?.full_name||'—'}</td><td>{m.profile?.email||'—'}</td><td>{m.role} · {m.status}</td><td>{m.role==='owner'?'Owner':<form action="/api/team/member" method="post" className="actions"><input type="hidden" name="memberId" value={m.id}/><select name="role" defaultValue={m.role}><option value="viewer">Viewer</option><option value="reviewer">Reviewer</option><option value="manager">Manager</option><option value="admin">Admin</option></select><select name="status" defaultValue={m.status}><option value="active">Active</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select><button className="secondary">Save</button></form>}</td></tr>)}</tbody></table></div>
  <TeamInviteCreator/></section>
  <section className="card panel section"><h2>Pending invitations</h2>{!invites?.length?<p className="empty">No active invitations.</p>:<table className="table"><thead><tr><th>Email</th><th>Role</th><th>Expires</th><th></th></tr></thead><tbody>{invites.map((x:any)=><tr key={x.id}><td>{x.email}</td><td>{x.role}</td><td>{new Date(x.expires_at).toLocaleString()}</td><td><form action="/api/team/invite/revoke" method="post"><input type="hidden" name="inviteId" value={x.id}/><button className="dangerBtn">Revoke</button></form></td></tr>)}</tbody></table>}</section>
  </>
}
