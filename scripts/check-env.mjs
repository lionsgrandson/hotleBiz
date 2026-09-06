const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','PII_ENCRYPTION_KEY','MATCHING_SECRET','AUDIT_HASH_SECRET','NEXT_PUBLIC_APP_URL','CRON_SECRET']
const missing=required.filter(k=>!process.env[k] || process.env[k]==='REPLACE_ME')
if(missing.length){console.error('Missing or placeholder environment variables:',missing.join(', '));process.exit(1)}
const key=Buffer.from(process.env.PII_ENCRYPTION_KEY,'base64')
if(key.length!==32){console.error('PII_ENCRYPTION_KEY must decode to exactly 32 bytes');process.exit(1)}
if((process.env.MATCHING_SECRET||'').length<32){console.error('MATCHING_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}
if((process.env.AUDIT_HASH_SECRET||'').length<32){console.error('AUDIT_HASH_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}
if((process.env.CRON_SECRET||'').length<32){console.error('CRON_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}
try { const u=new URL(process.env.NEXT_PUBLIC_APP_URL); if(!['http:','https:'].includes(u.protocol)) throw new Error() } catch { console.error('NEXT_PUBLIC_APP_URL must be a valid http(s) origin'); process.exit(1) }
console.log('Environment configuration looks valid.')
