import { createClient } from '@supabase/supabase-js'

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const tables=[
  'profiles','platform_admins','hotels','hotel_memberships','hotel_invites','hotel_verification_files',
  'guests','guest_identifiers','guest_access_grants','guest_hotel_links','stays',
  'stay_feedback','incidents','evidence_files','disputes','guest_portal_tokens',
  'record_revisions','audit_logs','retention_queue'
]
for(const table of tables){
  const{error}=await supabase.from(table).select('*',{head:true,count:'exact'})
  if(error){console.error(`Schema verification failed for ${table}: ${error.message}`);process.exit(1)}
  console.log(`OK ${table}`)
}

const columnChecks=[
  ['profiles','id,terms_version,terms_accepted_at,privacy_acknowledged_at'],
  ['hotels','id,network_terms_version,privacy_notice_version,legal_contact_email,feedback_retention_months,incident_retention_months,identity_retention_months'],
  ['hotel_invites','id,revoked_at'],
  ['hotel_verification_files','id,hotel_id,document_type,storage_path,sha256'],
]
for(const [table,columns] of columnChecks){
  const{error}=await supabase.from(table).select(columns,{head:true}).limit(1)
  if(error){console.error(`Launch schema verification failed for ${table}: ${error.message}`);process.exit(1)}
  console.log(`OK launch columns ${table}`)
}
console.log('Supabase database schema verified. Cloudflare R2 is verified separately by GO-LIVE.cmd.')
