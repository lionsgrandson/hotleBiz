import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { apiContext, fail, ApiError, requiredString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { encryptPII } from '@/lib/crypto'
import { audit } from '@/lib/audit'
import { getEvidenceBucket, R2_VERIFICATION_PREFIX, isVerificationPath } from '@/lib/cloudflare'

export const runtime='nodejs'
const TYPES=new Set(['registration','business_license','property_authority','other'])
const MIME_EXT:Record<string,string>={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}

function signature(bytes:Buffer,mime:string){
  if(mime==='application/pdf')return bytes.subarray(0,5).toString()==='%PDF-'
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
  if(mime==='image/png')return bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  if(mime==='image/webp')return bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'
  return false
}

export async function POST(request:Request){
  let uploaded:string|null=null
  try{
    const{admin,hotel,user}=await apiContext(request,MANAGE_ROLES)
    const form=await request.formData()
    if(String(form.get('action')||'')==='remove'){
      const fileId=requiredString(form.get('fileId'),'File',60)
      const{data:file,error}=await admin.from('hotel_verification_files').select('id,storage_path').eq('id',fileId).eq('hotel_id',hotel.id).maybeSingle()
      if(error)throw error
      if(!file||!isVerificationPath(file.storage_path))throw new ApiError(404,'Verification document not found')
      await getEvidenceBucket().delete(file.storage_path)
      const{error:deleteError}=await admin.from('hotel_verification_files').delete().eq('id',file.id).eq('hotel_id',hotel.id)
      if(deleteError)throw deleteError
      await audit(admin,{hotelId:hotel.id,userId:user.id,action:'property_verification_document_removed',targetType:'hotel_verification_file',targetId:file.id,purpose:'property verification'})
      return NextResponse.redirect(new URL('/verification',request.url),303)
    }

    const documentType=requiredString(form.get('documentType'),'Document type',40)
    if(!TYPES.has(documentType))throw new ApiError(400,'Invalid verification document type')
    const file=form.get('document')
    if(!(file instanceof File)||file.size<=0)throw new ApiError(400,'Verification document is required')
    if(file.size>10*1024*1024)throw new ApiError(413,'Verification document exceeds 10 MB')
    if(!(file.type in MIME_EXT))throw new ApiError(415,'Unsupported verification document type')
    const bytes=Buffer.from(await file.arrayBuffer())
    if(!signature(bytes,file.type))throw new ApiError(415,'Verification document content does not match its declared file type')
    const hash=crypto.createHash('sha256').update(bytes).digest('hex')
    uploaded=`${R2_VERIFICATION_PREFIX}${hotel.id}/${crypto.randomUUID()}${MIME_EXT[file.type]}`
    const bucket=getEvidenceBucket()
    await bucket.put(uploaded,bytes,{httpMetadata:{contentType:file.type},customMetadata:{sha256:hash,hotelId:hotel.id,purpose:'property-verification'}})
    const{data:row,error}=await admin.from('hotel_verification_files').insert({hotel_id:hotel.id,document_type:documentType,storage_path:uploaded,file_name_cipher:encryptPII(file.name.slice(-240)||`verification${MIME_EXT[file.type]}`),mime_type:file.type,size_bytes:file.size,sha256:hash,uploaded_by:user.id}).select('id').single()
    if(error)throw error
    await audit(admin,{hotelId:hotel.id,userId:user.id,action:'property_verification_document_uploaded',targetType:'hotel_verification_file',targetId:row.id,purpose:'property verification',metadata:{documentType,sizeBytes:file.size}})
    return NextResponse.redirect(new URL('/verification',request.url),303)
  }catch(e){
    if(uploaded){try{await getEvidenceBucket().delete(uploaded)}catch{}}
    return fail(e,request)
  }
}
