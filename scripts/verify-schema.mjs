import { createClient } from '@supabase/supabase-js'
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const tables=[
  'profiles','platform_admins','hotels','hotel_memberships','hotel_invites',
  'guests','guest_identifiers','guest_access_grants','guest_hotel_links','stays',
  'stay_feedback','incidents','evidence_files','disputes','guest_portal_tokens',
  'record_revisions','audit_logs','retention_queue'
]
for(const table of tables){
  const{error}=await supabase.from(table).select('*',{head:true,count:'exact'})
  if(error){console.error(`Schema verification failed for ${table}: ${error.message}`);process.exit(1)}
  console.log(`OK ${table}`)
}
const{data,error}=await supabase.storage.getBucket('incident-evidence')
if(error||!data){console.error('Evidence bucket missing',error?.message||'');process.exit(1)}
if(data.public){console.error('Evidence bucket must remain private');process.exit(1)}
console.log('Database and private evidence storage verified.')
