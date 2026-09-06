import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const ignored = new Set(['node_modules', '.next', '.git', '.vercel', '.open-next', '.wrangler', '.cloudflare-dry-run'])
const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue
    if (name.endsWith('.tmp.json')) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full)
    else files.push(full)
  }
}
walk(root)

const textFiles = files.filter(f => /\.(?:ts|tsx|mjs|md|json|jsonc|toml|sql|cmd|example|gitignore)$/.test(f) || /(?:Dockerfile|\.env\.example|\.gitignore)$/.test(f))
const staleBrand = []
const obviousSecrets = []
for (const file of textFiles) {
  const text = readFileSync(file, 'utf8')
  const legacyBrand = new RegExp(`${'Stay' + 'Trust'}|${'stay' + 'trust'}`)
  if (legacyBrand.test(text)) staleBrand.push(relative(root, file))
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) obviousSecrets.push(relative(root, file))
  if (/CLOUDFLARE_API_TOKEN\s*=\s*[^\s#]+/.test(text) && !text.includes('CLOUDFLARE_API_TOKEN=')) obviousSecrets.push(relative(root, file))
}
if (staleBrand.length) throw new Error(`Old product branding remains in: ${staleBrand.join(', ')}`)
if (obviousSecrets.length) throw new Error(`Possible committed secret in: ${[...new Set(obviousSecrets)].join(', ')}`)

const requiredFiles = [
  'supabase/migrations/202609060001_init.sql',
  'supabase/migrations/202609060002_hardening.sql',
  'src/app/api/search/route.ts',
  'src/app/api/guests/route.ts',
  'src/app/api/incidents/route.ts',
  'src/app/api/evidence/[id]/route.ts',
  'src/app/api/guest-portal/dispute/route.ts',
  'src/components/MfaGate.tsx',
  'src/lib/cloudflare.ts',
  'workers/maintenance.ts',
  'wrangler.jsonc',
  'wrangler.maintenance.jsonc',
  'open-next.config.ts',
  'GO-LIVE.cmd',
  'proxy.ts',
]
for (const file of requiredFiles) if (!files.includes(join(root, file))) throw new Error(`Required product file missing: ${file}`)
for (const retired of ['vercel.json','scripts/sync-vercel-env.mjs']) if (files.includes(join(root, retired))) throw new Error(`Retired Vercel deployment file still present: ${retired}`)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (typeof version !== 'string' || /^[~^*><=]/.test(version) || version.includes('latest')) throw new Error(`Dependency ${name} must be exactly pinned; found ${version}`)
}
if (!String(pkg.engines?.node || '').includes('22')) throw new Error('Node 22+ engine requirement is missing')
if (!pkg.devDependencies?.['@opennextjs/cloudflare'] || !pkg.devDependencies?.wrangler) throw new Error('Cloudflare build dependencies are missing')

const wrangler = JSON.parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8'))
if (!wrangler.compatibility_flags?.includes('nodejs_compat')) throw new Error('Cloudflare nodejs_compat flag is required')
if (!wrangler.r2_buckets?.some((b) => b.binding === 'EVIDENCE_BUCKET' && b.bucket_name === 'guestatlas-evidence')) throw new Error('Private GuestAtlas evidence R2 binding is missing')
if (!wrangler.observability?.enabled) throw new Error('Cloudflare observability must be enabled')

console.log(`GuestAtlas Cloudflare source check passed (${files.length} files scanned).`)
