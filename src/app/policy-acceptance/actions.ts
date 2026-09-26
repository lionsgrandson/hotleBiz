'use server'
import { redirect } from 'next/navigation'
import { requireMfa, requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { POLICY_VERSION } from '@/lib/public-config'
import { audit } from '@/lib/audit'

export async function acceptCurrentPolicies(formData:FormData){
  await requireMfa()
  const user=await requireUser()
  if(!formData.get('terms')||!formData.get('privacy')||!formData.get('acceptableUse'))redirect('/policy-acceptance?error=accept')
  const admin=createAdminClient()
  const now=new Date().toISOString()
  const{error}=await admin.from('profiles').update({terms_version:POLICY_VERSION,terms_accepted_at:now,privacy_acknowledged_at:now}).eq('id',user.id)
  if(error)throw error
  await audit(admin,{userId:user.id,action:'staff_policy_acknowledged',targetType:'profile',targetId:user.id,purpose:'versioned service terms and privacy acknowledgement',metadata:{policyVersion:POLICY_VERSION}})
  redirect('/dashboard')
}
