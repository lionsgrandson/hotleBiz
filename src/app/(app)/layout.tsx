import { requireHotelContext, isPlatformAdmin, requireMfa } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { ErrorBanner } from '@/components/ErrorBanner'
export const dynamic='force-dynamic'
export default async function AppLayout({children}:{children:React.ReactNode}){await requireMfa();const ctx=await requireHotelContext();const platform=await isPlatformAdmin(ctx.user.id);return <div className="shell"><Sidebar hotelName={ctx.hotel.name} hotelId={ctx.hotel.id} role={ctx.membership.role} memberships={ctx.memberships} isAdmin={platform}/><main className="content"><ErrorBanner/>{children}</main></div>}
