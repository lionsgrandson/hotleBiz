import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function loadEnv(path='.env.local'){
  if(!existsSync(path)) return
  for(const raw of readFileSync(path,'utf8').split(/\r?\n/)){
    const line=raw.trim(); if(!line || line.startsWith('#')) continue
    const i=line.indexOf('='); if(i<1) continue
    const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim()
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1)
    if(process.env[k]===undefined) process.env[k]=v
  }
}
loadEnv()

const publicVars=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_APP_URL','REQUIRE_MFA','EMAIL_FROM']
const secretVars=['SUPABASE_SECRET_KEY','PII_ENCRYPTION_KEY','MATCHING_SECRET','AUDIT_HASH_SECRET','CRON_SECRET','RESEND_API_KEY']
const token=process.env.VERCEL_TOKEN
const npx=process.platform==='win32'?'npx.cmd':'npx'

function run(name, sensitive){
  const value=process.env[name]
  if(!value) return
  const args=['vercel@59.11.7','env','add',name,'production','--force']
  if(sensitive) args.push('--sensitive')
  if(token) args.push('--token',token)
  const result=spawnSync(npx,args,{input:`${value}\n`,stdio:['pipe','inherit','inherit'],shell:false})
  if(result.error) throw result.error
  if(result.status!==0) throw new Error(`Vercel environment sync failed for ${name}`)
  console.log(`Synced ${name}`)
}
for(const name of publicVars) run(name,false)
for(const name of secretVars) run(name,true)
console.log('Vercel production environment synchronized.')
