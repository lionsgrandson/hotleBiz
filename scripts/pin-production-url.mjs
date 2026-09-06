import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const envPath = process.argv[2] || '.env.local'
const productionUrl = 'https://guestatlas.mosheschwartzberg.workers.dev'

if (!existsSync(envPath)) throw new Error(`Environment file not found: ${envPath}`)

let text = readFileSync(envPath, 'utf8')

function setValue(key, value) {
  const line = `${key}=${value}`
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}=.*$`, 'm')
  if (re.test(text)) text = text.replace(re, line)
  else text += `${text.endsWith('\n') ? '' : '\n'}${line}\n`
}

setValue('NEXT_PUBLIC_APP_URL', productionUrl)
setValue('GUESTATLAS_URL_MODE', 'workers_dev_resolved')
setValue('CLOUDFLARE_CUSTOM_DOMAIN', '')

writeFileSync(envPath, text, { mode: 0o600 })
console.log(`[URL] Pinned GuestAtlas production URL: ${productionUrl}`)
