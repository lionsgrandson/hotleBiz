import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2] || '.env.local'
const values = {}
for (const raw of readFileSync(source, 'utf8').split(/\r?\n/)) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i <= 0) continue
  values[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY',
  'PII_ENCRYPTION_KEY','MATCHING_SECRET','AUDIT_HASH_SECRET','NEXT_PUBLIC_APP_URL','REQUIRE_MFA','CRON_SECRET',
  'NEXT_PUBLIC_LEGAL_NAME','NEXT_PUBLIC_PRIVACY_EMAIL','NEXT_PUBLIC_SECURITY_EMAIL','NEXT_PUBLIC_ACCESSIBILITY_EMAIL',
]
const optional = ['RESEND_API_KEY','EMAIL_FROM','PLATFORM_ADMIN_EMAILS','NEXT_PUBLIC_DPO_EMAIL','NEXT_PUBLIC_LEGAL_ADDRESS','NEXT_PUBLIC_LEGAL_COUNTRY']
const missing = required.filter((key) => !values[key] || values[key] === 'REPLACE_ME')
if (missing.length) throw new Error(`Cannot build Cloudflare environment bundle; missing: ${missing.join(', ')}`)

const runtime = {}
for (const key of [...required, ...optional]) if (values[key]) runtime[key] = values[key]
const maintenance = { APP_URL: values.NEXT_PUBLIC_APP_URL, CRON_SECRET: values.CRON_SECRET }

writeFileSync('.cloudflare.secrets.tmp.json', JSON.stringify(runtime, null, 2), { mode: 0o600 })
writeFileSync('.maintenance.secrets.tmp.json', JSON.stringify(maintenance, null, 2), { mode: 0o600 })
console.log('Prepared allow-listed Cloudflare runtime environment bundles.')
