import Link from 'next/link'
const nav=[
  {href:'/dashboard',label:'Overview'},
  {href:'/guests',label:'Guests'},
  {href:'/stays/new',label:'New stay',write:true},
  {href:'/feedback/new',label:'Add feedback',write:true},
  {href:'/incidents',label:'Incidents'},
  {href:'/moderation',label:'Review queue',manage:true},
  {href:'/disputes',label:'Disputes',manage:true},
  {href:'/audit',label:'Audit log',manage:true},
  {href:'/retention',label:'Retention',manage:true},
  {href:'/team',label:'Team',manage:true},
]
export function Sidebar({ hotelName, hotelId, role, memberships, isAdmin=false }: {hotelName:string;hotelId:string;role:string;memberships:any[];isAdmin?:boolean}) {
const canWrite=['owner','admin','manager','reviewer'].includes(role),canManage=['owner','admin','manager'].includes(role);const visible=nav.filter(n=>(!n.write||canWrite)&&(!n.manage||canManage));
return <aside className="sidebar"><div className="brand"><span className="brandMark">G</span><div><strong>GuestAtlas</strong><small>Hospitality intelligence</small></div></div><div className="property"><span>Current property</span><strong>{hotelName}</strong><small>{role}</small>{memberships.length>1&&<form action="/api/hotel/select" method="post"><select name="hotelId" defaultValue={hotelId} aria-label="Switch property">{memberships.map(m=><option key={m.hotel_id} value={m.hotel_id}>{m.hotel?.name||m.hotel_id}</option>)}</select><button className="linkButton">Switch</button></form>}</div><nav>{visible.map(n=><Link key={n.href} href={n.href}>{n.label}</Link>)}{isAdmin&&<Link href="/platform">Platform admin</Link>}</nav><div className="sidebarFoot"><Link href="/privacy">Privacy</Link><form action="/auth/signout" method="post"><button className="linkButton">Sign out</button></form></div></aside>}
