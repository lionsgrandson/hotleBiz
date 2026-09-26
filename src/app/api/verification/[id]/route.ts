import { createAdminClient } from '@/lib/supabase/admin'
import { getHotelContext, getVerifiedUser, hasRequiredMfa, isPlatformAdmin } from '@/lib/auth'
import { ApiError, fail } from '@/lib/http'
import { decryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'
import { getEvidenceBucket, isVerificationPath } from '@/lib/cloudflare'

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    if(!await hasRequiredMfa())throw new ApiError(403,'MFA required')
    const user=await getVerifiedUser()
    if(!user)throw new ApiError(401,'Authentication required')
    const{id}=await params
    const admin=createAdminClient()
    const{data:file,error}=await admin.from('hotel_verification_files').select('*').eq('id',id).maybeSingle()
    if(error)throw error
    if(!file||!isVerificationPath(file.storage_path))throw new ApiError(404,'Verification document not found')
    const platform=await isPlatformAdmin(user.id)
    let hotelId:string|null=null
    if(!platform){
      const ctx=await getHotelContext()
      if(!ctx?.hotel||ctx.hotel.id!==file.hotel_id||!['owner','admin','manager'].includes(String(ctx.membership?.role)))throw new ApiError(403,'Verification document access denied')
      hotelId=ctx.hotel.id
    }
    const object=await getEvidenceBucket().get(file.storage_path)
    if(!object)throw new ApiError(404,'Verification object not found')
    let name='verification-document'
    try{name=decryptPII(file.file_name_cipher)||name}catch{}
    name=name.replace(/[\r\n]/g,'').slice(0,240)||'verification-document'
    await audit(admin,{hotelId:hotelId||file.hotel_id,userId:user.id,action:'property_verification_document_downloaded',targetType:'hotel_verification_file',targetId:id,purpose:'property verification',metadata:{platformAdmin:platform}})
    return new Response(object.body,{headers:{'content-type':file.mime_type||object.httpMetadata?.contentType||'application/octet-stream','content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,'cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff'}})
  }catch(e){return fail(e,request)}
}
