import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, requiredString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request:Request){
  try{
    const {admin,hotel,user}=await apiContext(request,MANAGE_ROLES)
    const b=await body(request), id=requiredString(b.inviteId,'Invitation',60)
    const {data,error}=await admin.from('hotel_invites').update({revoked_at:new Date().toISOString()}).eq('id',id).eq('hotel_id',hotel.id).is('accepted_at',null).is('revoked_at',null).select('id').maybeSingle()
    if(error)throw error
    if(!data)throw new ApiError(404,'Active invitation not found')
    await audit(admin,{hotelId:hotel.id,userId:user.id,action:'staff_invitation_revoked',targetType:'hotel_invite',targetId:id,purpose:'staff administration'})
    return NextResponse.redirect(new URL('/team',request.url),303)
  }catch(e){return fail(e,request)}
}
