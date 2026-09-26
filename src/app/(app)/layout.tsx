import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireHotelContext, isPlatformAdmin, requireMfa } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { ErrorBanner } from '@/components/ErrorBanner'
import { POLICY_VERSION } from '@/lib/public-config'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } }

export default async function AppLayout({children}:{children:React.ReactNode}){
  await requireMfa()
  const ctx=await requireHotelContext()
  const {data:profile,error}=await ctx.admin.from('profiles').select('terms_version,terms_accepted_at,privacy_acknowledged_at').eq('id',ctx.user.id).maybeSingle()
  if(error)throw error
  if(!profile||profile.terms_version!==POLICY_VERSION||!profile.terms_accepted_at||!profile.privacy_acknowledged_at)redirect('/policy-acceptance')
  const platform=await isPlatformAdmin(ctx.user.id)
  return <div className="shell"><Sidebar hotelName={ctx.hotel.name} hotelId={ctx.hotel.id} role={ctx.membership.role} memberships={ctx.memberships} isAdmin={platform}/><main className="content"><ErrorBanner/>{children}</main></div>
}
