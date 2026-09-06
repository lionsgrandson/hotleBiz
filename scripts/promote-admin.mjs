import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
function loadEnv(path='.env.local'){
  if(!existsSync(path)) return
  for(const raw of readFileSync(path,'utf8').split(/\r?\n/)){
    const line=raw.trim(); if(!line || line.startsWith('#')) continue
    const i=line.indexOf('='); if(i<1) continue
    const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim()
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1)
    if(!process.env[k]) process.env[k]=v
  }
}
loadEnv()
const email=process.argv[2]
if(!email){console.error('Usage: node scripts/promote-admin.mjs you@example.com');process.exit(1)}
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY){console.error('Missing Supabase environment. Fill .env.local first.');process.exit(1)}
const allow=(process.env.PLATFORM_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)
if(allow.length && !allow.includes(email.toLowerCase())){console.error('Email is not present in PLATFORM_ADMIN_EMAILS.');process.exit(1)}
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
let page=1,user=null
while(!user){const{data,error}=await s.auth.admin.listUsers({page,perPage:1000});if(error)throw error;user=data.users.find(u=>(u.email||'').toLowerCase()===email.toLowerCase());if(user||data.users.length<1000)break;page++}
if(!user){console.error('User not found. Sign up first.');process.exit(1)}
const up=await s.from('platform_admins').upsert({user_id:user.id});if(up.error)throw up.error
console.log(`Platform admin enabled for ${email}`)
