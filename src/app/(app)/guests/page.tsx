import { SearchForm } from '@/components/SearchForm'
import { requireHotelContext } from '@/lib/auth'
import { guestDisplay } from '@/lib/data'
import Link from 'next/link'

export default async function Guests({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const sp=await searchParams
  const { admin, hotel } = await requireHotelContext()
  const { data: links } = await admin.from('guest_hotel_links').select('guest_id,last_stay_at,guest:guests(*)').eq('hotel_id',hotel.id).order('last_stay_at',{ascending:false}).limit(12)
  return <><div className="topline"><div><span className="eyebrow">Controlled lookup</span><h1>Guest network</h1></div></div>{sp.error&&<p className="error">Guest access expired or was not authorized. Run an exact-match search again.</p>}<SearchForm networkEnabled={hotel.verification_status==='verified'}/><section className="card panel section"><div className="formHeading"><div><span className="eyebrow">Your property</span><h2>Recently handled guests</h2></div><Link className="secondary" href="/guests/new">New guest</Link></div>{(links||[]).length===0?<p className="empty">No property-linked guests yet.</p>:<table className="table"><thead><tr><th>Guest</th><th>Country</th><th>Last stay</th><th></th></tr></thead><tbody>{(links||[]).map((link:any)=>{const g=guestDisplay(link.guest);return <tr key={link.guest_id}><td>{g.legalName}</td><td>{g.countryCode||'—'}</td><td>{link.last_stay_at?new Date(link.last_stay_at).toLocaleDateString():'—'}</td><td><Link href={`/guests/${g.id}?purpose=existing%20property%20relationship`}>Open</Link></td></tr>})}</tbody></table>}</section></>
}
