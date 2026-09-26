import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tokenHash } from '@/lib/crypto'
import { assertSameOrigin, body, fail, ApiError, requiredString } from '@/lib/http'
import { audit } from '@/lib/audit'

export async function POST(request:Request){
  try{
    assertSameOrigin(request)
    const b=await body(request)
    const token=requiredString(b.token,'Access credential',200)
    const admin=createAdminClient()
    const now=Date.now()
    const{data:t,error}=await admin.from('guest_portal_tokens').select('id,guest_id,source_hotel_id,expires_at').eq('token_hash',tokenHash(token)).gt('expires_at',new Date(now).toISOString()).is('revoked_at',null).maybeSingle()
    if(error)throw error
    if(!t)throw new ApiError(401,'Access link is invalid, revoked, or expired')
    const maxAge=Math.max(60,Math.min(7*86400,Math.floor((new Date(t.expires_at).getTime()-now)/1000)))
    await audit(admin,{hotelId:t.source_hotel_id,userId:null,action:'guest_portal_session_started',targetType:'guest',targetId:t.guest_id,purpose:'guest personal data access'})
    const res=NextResponse.json({ok:true})
    res.cookies.set('guestatlas_guest_access',token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge})
    return res
  }catch(e){return fail(e,request)}
}
