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
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'PII_ENCRYPTION_KEY',
  'MATCHING_SECRET',
  'AUDIT_HASH_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'REQUIRE_MFA',
  'CRON_SECRET',
]
const optional = ['RESEND_API_KEY', 'EMAIL_FROM', 'PLATFORM_ADMIN_EMAILS']
const missing = required.filter((key) => !values[key] || values[key] === 'REPLACE_ME')
if (missing.length) throw new Error(`Cannot build Cloudflare secrets; missing: ${missing.join(', ')}`)

const runtime = {}
for (const key of [...required, ...optional]) if (values[key]) runtime[key] = values[key]
const maintenance = {
  APP_URL: values.NEXT_PUBLIC_APP_URL,
  CRON_SECRET: values.CRON_SECRET,
}

// Never copy deployment credentials such as CLOUDFLARE_API_TOKEN or
// SUPABASE_ACCESS_TOKEN into either Worker.
writeFileSync('.cloudflare.secrets.tmp.json', JSON.stringify(runtime, null, 2), { mode: 0o600 })
writeFileSync('.maintenance.secrets.tmp.json', JSON.stringify(maintenance, null, 2), { mode: 0o600 })
console.log('Prepared sanitized Cloudflare secret bundles.')
