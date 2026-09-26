import { NextResponse } from 'next/server'
import { getVerifiedUser, isPlatformAdmin, hasRequiredMfa } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSameOrigin, body, fail, ApiError, requiredString } from '@/lib/http'
import { audit } from '@/lib/audit'

export async function POST(request:Request){
  try{
    assertSameOrigin(request)
    if(!await hasRequiredMfa())throw new ApiError(403,'Multi-factor authentication required')
    const user=await getVerifiedUser()
    if(!user||!await isPlatformAdmin(user.id))throw new ApiError(403,'Platform administrator required')
    const b=await body(request)
    const hotelId=requiredString(b.hotelId,'Hotel',60)
    const decision=String(b.decision)
    const notes=requiredString(b.notes,'Verification notes',1000)
    if(notes.length<10)throw new ApiError(400,'Verification notes must describe the review source or reason')
    if(!['verified','rejected','suspended'].includes(decision))throw new ApiError(400,'Invalid decision')
    const admin=createAdminClient()
    const{data:hotel,error:loadError}=await admin.from('hotels').select('id,name,legal_contact_email').eq('id',hotelId).maybeSingle()
    if(loadError)throw loadError
    if(!hotel)throw new ApiError(404,'Property not found')
    const{error}=await admin.from('hotels').update({verification_status:decision,verification_notes:notes,verified_at:decision==='verified'?new Date().toISOString():null,verified_by:user.id}).eq('id',hotelId)
    if(error)throw error
    await audit(admin,{userId:user.id,action:`hotel_${decision}`,targetType:'hotel',targetId:hotelId,purpose:'network property verification',metadata:{reviewNotesRecorded:true}})

    if(process.env.RESEND_API_KEY&&hotel.legal_contact_email){
      const base=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin
      try{await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'GuestAtlas <noreply@example.com>',to:[hotel.legal_contact_email],subject:`GuestAtlas property verification: ${decision}`,text:`The GuestAtlas verification status for ${hotel.name} is now: ${decision}.\n\nSign in: ${base}/login\n\nIf you believe this is incorrect, contact the GuestAtlas privacy/support contact shown on the service.`})})}catch{}
    }
    return NextResponse.redirect(new URL('/platform',request.url),303)
  }catch(e){return fail(e,request)}
}
