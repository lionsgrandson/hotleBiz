const production = process.argv.includes('--production')
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','PII_ENCRYPTION_KEY','MATCHING_SECRET','AUDIT_HASH_SECRET','NEXT_PUBLIC_APP_URL','CRON_SECRET']
const missing=required.filter(k=>!process.env[k] || process.env[k]==='REPLACE_ME')
if(missing.length){console.error('Missing or placeholder environment variables:',missing.join(', '));process.exit(1)}

const key=Buffer.from(process.env.PII_ENCRYPTION_KEY,'base64')
if(key.length!==32){console.error('PII_ENCRYPTION_KEY must decode to exactly 32 bytes');process.exit(1)}
if((process.env.MATCHING_SECRET||'').length<32){console.error('MATCHING_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}
if((process.env.AUDIT_HASH_SECRET||'').length<32){console.error('AUDIT_HASH_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}
if((process.env.CRON_SECRET||'').length<32){console.error('CRON_SECRET must be a high-entropy secret (32+ characters)');process.exit(1)}

let app
try { app=new URL(process.env.NEXT_PUBLIC_APP_URL); if(!['http:','https:'].includes(app.protocol)) throw new Error() } catch { console.error('NEXT_PUBLIC_APP_URL must be a valid http(s) origin'); process.exit(1) }
if(app.pathname!=='/' || app.search || app.hash){console.error('NEXT_PUBLIC_APP_URL must be an origin only, without path/query/hash');process.exit(1)}

const urlMode=(process.env.GUESTATLAS_URL_MODE||'').trim()
const autoBootstrap=urlMode==='workers_dev_auto'
const bootstrapHost='guestatlas-bootstrap.invalid'
if(autoBootstrap && app.hostname!==bootstrapHost){console.error(`workers_dev_auto mode requires NEXT_PUBLIC_APP_URL=https://${bootstrapHost} until Cloudflare assigns the real URL`);process.exit(1)}
if(!autoBootstrap && app.hostname===bootstrapHost){console.error('Bootstrap URL is only allowed while GUESTATLAS_URL_MODE=workers_dev_auto');process.exit(1)}

if(production && app.protocol!=='https:'){console.error('Production NEXT_PUBLIC_APP_URL must use HTTPS');process.exit(1)}
if(production && ['localhost','127.0.0.1','::1'].includes(app.hostname)){console.error('Production NEXT_PUBLIC_APP_URL cannot be localhost');process.exit(1)}

try { const supa=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL); if(supa.protocol!=='https:') throw new Error() } catch { console.error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL'); process.exit(1) }

const custom=(process.env.CLOUDFLARE_CUSTOM_DOMAIN||'').trim()
if(custom && (custom.includes('/') || custom.includes(':') || custom!==custom.toLowerCase())){console.error('CLOUDFLARE_CUSTOM_DOMAIN must be a lowercase hostname only, without scheme/path/port');process.exit(1)}
if(autoBootstrap && custom){console.error('CLOUDFLARE_CUSTOM_DOMAIN must be blank while automatic workers.dev discovery is enabled');process.exit(1)}
if(custom && app.hostname!==custom){console.error('CLOUDFLARE_CUSTOM_DOMAIN must match the hostname in NEXT_PUBLIC_APP_URL');process.exit(1)}
if(production && !autoBootstrap && !custom && !app.hostname.endsWith('.workers.dev')){console.error('Set CLOUDFLARE_CUSTOM_DOMAIN to the NEXT_PUBLIC_APP_URL hostname, or use the actual *.workers.dev URL as NEXT_PUBLIC_APP_URL');process.exit(1)}

if(autoBootstrap) console.log('Environment configuration is valid for first-deploy workers.dev bootstrap.')
else console.log(`Environment configuration looks valid for ${production?'production ':''}Cloudflare deployment.`)
