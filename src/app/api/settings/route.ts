import { NextResponse } from 'next/server'
import { apiContext, body, fail, ApiError, integerIn, requiredString } from '@/lib/http'
import { MANAGE_ROLES } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request:Request){
  try{
    const {admin,hotel,user}=await apiContext(request,MANAGE_ROLES)
    const b=await body(request)
    if(!b.attest)throw new ApiError(400,'Retention-policy attestation is required')
    const email=requiredString(b.legalContactEmail,'Legal contact email',320).toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError(400,'Enter a valid contact email')
    const feedback=integerIn(b.feedbackRetentionMonths,6,120,'Feedback retention')
    const incidents=integerIn(b.incidentRetentionMonths,12,180,'Incident retention')
    const identity=integerIn(b.identityRetentionMonths,12,180,'Identity retention')
    const {error}=await admin.from('hotels').update({legal_contact_email:email,feedback_retention_months:feedback,incident_retention_months:incidents,identity_retention_months:identity}).eq('id',hotel.id)
    if(error)throw error
    await audit(admin,{hotelId:hotel.id,userId:user.id,action:'property_governance_updated',targetType:'hotel',targetId:hotel.id,purpose:'privacy and retention governance',metadata:{feedbackRetentionMonths:feedback,incidentRetentionMonths:incidents,identityRetentionMonths:identity}})
    return NextResponse.redirect(new URL('/settings',request.url),303)
  }catch(e){return fail(e,request)}
}
