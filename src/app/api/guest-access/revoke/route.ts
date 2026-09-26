import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request:Request){
  try{
    const {admin,hotel,user}=await apiContext(request,MANAGE_ROLES)
    const b=await body(request), tokenId=requiredString(b.tokenId,'Access token',60), guestId=requiredString(b.guestId,'Guest',60)
    const {data,error}=await admin.from('guest_portal_tokens').update({revoked_at:new Date().toISOString()}).eq('id',tokenId).eq('guest_id',guestId).eq('source_hotel_id',hotel.id).is('revoked_at',null).select('id').maybeSingle()
    if(error)throw error
    if(!data)throw new ApiError(404,'Active guest access link not found')
    await audit(admin,{hotelId:hotel.id,userId:user.id,action:'guest_portal_link_revoked',targetType:'guest',targetId:guestId,purpose:'guest access security'})
    return NextResponse.redirect(new URL(`/guest-access/${guestId}`,request.url),303)
  }catch(e){return fail(e,request)}
}
