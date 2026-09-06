import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const logPath = process.argv[2] || '.guestatlas-first-deploy.log'
const envPath = process.argv[3] || '.env.local'

if (!existsSync(logPath)) throw new Error(`Deployment log not found: ${logPath}`)
if (!existsSync(envPath)) throw new Error(`Environment file not found: ${envPath}`)

const log = readFileSync(logPath, 'utf8').replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
const matches = [...log.matchAll(/https:\/\/guestatlas\.[a-z0-9-]+\.workers\.dev\/?/gi)]
if (!matches.length) {
  throw new Error('Cloudflare deployment succeeded but the guestatlas workers.dev URL could not be found in Wrangler output. Open Cloudflare > Workers & Pages > guestatlas > Settings > Domains & Routes, then set NEXT_PUBLIC_APP_URL manually and rerun GO-LIVE.cmd.')
}

const url = matches[matches.length - 1][0].replace(/\/$/, '')
let text = readFileSync(envPath, 'utf8')

function setValue(key, value) {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=.*$`, 'm')
  if (re.test(text)) text = text.replace(re, line)
  else text += `${text.endsWith('\n') ? '' : '\n'}${line}\n`
}

setValue('NEXT_PUBLIC_APP_URL', url)
setValue('GUESTATLAS_URL_MODE', 'workers_dev_resolved')
setValue('CLOUDFLARE_CUSTOM_DOMAIN', '')
writeFileSync(envPath, text, { mode: 0o600 })

console.log(url)
