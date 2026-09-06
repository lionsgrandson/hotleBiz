import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const ignored = new Set(['node_modules', '.next', '.git', '.vercel', '.open-next', '.wrangler', '.cloudflare-dry-run', '.temp'])
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
  'middleware.ts',
  'scripts/deploy-and-capture.mjs',
  'scripts/finalize-workers-url.mjs',
]
for (const file of requiredFiles) if (!files.includes(join(root, file))) throw new Error(`Required product file missing: ${file}`)
for (const retired of ['vercel.json','scripts/sync-vercel-env.mjs','proxy.ts']) if (files.includes(join(root, retired))) throw new Error(`Retired/incompatible deployment file still present: ${retired}`)

const middleware = readFileSync(join(root, 'middleware.ts'), 'utf8')
if (!middleware.includes('export async function middleware') && !middleware.includes('export function middleware')) throw new Error('middleware.ts must export a middleware function for OpenNext compatibility')

const goLive = readFileSync(join(root, 'GO-LIVE.cmd'), 'utf8')
if (!goLive.includes('finalize-workers-url.mjs') || !goLive.includes('deploy-and-capture.mjs') || !goLive.includes('workers_dev_auto')) throw new Error('GO-LIVE.cmd must support streamed automatic workers.dev URL discovery')

const deployCapture = readFileSync(join(root, 'scripts/deploy-and-capture.mjs'), 'utf8')
if (deployCapture.includes("'npx.cmd'") || deployCapture.includes('"npx.cmd"')) throw new Error('Windows deploy capture must not spawn npx.cmd directly')
if (!deployCapture.includes('process.execPath') || !deployCapture.includes('node_modules/@opennextjs/cloudflare/dist/cli/index.js')) throw new Error('Deploy capture must launch the OpenNext JavaScript CLI with Node directly')

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8')
if (!/^supabase\/\.temp\/$/m.test(gitignore)) throw new Error('Supabase CLI temp state must be gitignored')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (typeof version !== 'string' || /^[~^*><=]/.test(version) || version.includes('latest')) throw new Error(`Dependency ${name} must be exactly pinned; found ${version}`)
}
if (!String(pkg.engines?.node || '').includes('22')) throw new Error('Node 22+ engine requirement is missing')
if (!pkg.devDependencies?.['@opennextjs/cloudflare'] || !pkg.devDependencies?.wrangler) throw new Error('Cloudflare build dependencies are missing')

const wrangler = JSON.parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8'))
if (!wrangler.compatibility_flags?.includes('nodejs_compat')) throw new Error('Cloudflare nodejs_compat flag is required')
const evidenceBindings = (wrangler.r2_buckets || []).filter((b) => b.bucket_name === 'guestatlas-evidence')
if (evidenceBindings.length !== 1 || evidenceBindings[0].binding !== 'EVIDENCE_BUCKET') throw new Error('GuestAtlas must have exactly one private evidence R2 binding named EVIDENCE_BUCKET')
if (!wrangler.observability?.enabled) throw new Error('Cloudflare observability must be enabled')
if (wrangler.workers_dev !== true) throw new Error('workers.dev must remain enabled for automatic first-deploy URL bootstrap')

console.log(`GuestAtlas Cloudflare source check passed (${files.length} files scanned).`)
