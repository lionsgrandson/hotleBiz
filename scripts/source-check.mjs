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
  'supabase/migrations/202609260003_launch_hardening.sql',
  'src/app/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/acceptable-use/page.tsx',
  'src/app/cookies/page.tsx',
  'src/app/accessibility/page.tsx',
  'src/app/security/page.tsx',
  'src/app/.well-known/security.txt/route.ts',
  'src/app/forgot-password/page.tsx',
  'src/app/reset-password/page.tsx',
  'src/app/auth/recovery/route.ts',
  'src/app/policy-acceptance/page.tsx',
  'src/app/api/search/route.ts',
  'src/app/api/guests/route.ts',
  'src/app/api/incidents/route.ts',
  'src/app/api/evidence/[id]/route.ts',
  'src/app/api/guest-portal/dispute/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/guest-rights/page.tsx',
  'src/components/MfaGate.tsx',
  'src/lib/cloudflare.ts',
  'workers/maintenance.ts',
  'wrangler.jsonc',
  'wrangler.maintenance.jsonc',
  'open-next.config.ts',
  'GO-LIVE.cmd',
  'middleware.ts',
]
for (const file of requiredFiles) if (!files.includes(join(root, file))) throw new Error(`Required product file missing: ${file}`)
for (const retired of ['vercel.json','scripts/sync-vercel-env.mjs','proxy.ts','.github/workflows/ci.yml','scripts/deploy-and-capture.mjs','scripts/finalize-workers-url.mjs']) if (files.includes(join(root, retired))) throw new Error(`Retired/incompatible deployment file still present: ${retired}`)

const middleware = readFileSync(join(root, 'middleware.ts'), 'utf8')
if (!middleware.includes('export async function middleware') && !middleware.includes('export function middleware')) throw new Error('middleware.ts must export a middleware function for OpenNext compatibility')

const productionUrl = 'https://guestatlas.mosheschwartzberg.workers.dev'
const goLive = readFileSync(join(root, 'GO-LIVE.cmd'), 'utf8')
if (!goLive.includes('pin-production-url.mjs')) throw new Error('GO-LIVE.cmd must pin the final production URL')
if (/\bnpx\s+supabase\s+config\s+push\b/i.test(goLive)) throw new Error('GO-LIVE.cmd must not run supabase config push')
if (!goLive.includes('supabase db push')) throw new Error('GO-LIVE.cmd must apply Postgres migrations')
if (/\bgit\s+(?:pull|push|fetch|commit|reset|checkout)\b/i.test(goLive)) throw new Error('GO-LIVE.cmd must not depend on Git operations')
if (!goLive.includes('/api/health')) throw new Error('GO-LIVE.cmd must run a production health smoke check')
const pinUrl = readFileSync(join(root, 'scripts/pin-production-url.mjs'), 'utf8')
if (!pinUrl.includes(productionUrl) || !pinUrl.includes("workers_dev_resolved")) throw new Error('Production URL pin helper must enforce the final GuestAtlas workers.dev URL')

const supabaseConfig = readFileSync(join(root, 'supabase/config.toml'), 'utf8')
if (!supabaseConfig.includes(`site_url = "${productionUrl}"`)) throw new Error('Supabase Auth site_url reference must use the final GuestAtlas production URL')
if (!supabaseConfig.includes(`${productionUrl}/auth/confirm`) || !supabaseConfig.includes(`${productionUrl}/auth/recovery`)) throw new Error('Supabase Auth redirects must include confirm and recovery callbacks')
if (/localhost:3000/.test(supabaseConfig)) throw new Error('Supabase config must not contain localhost:3000')
if (/^\[storage\]/m.test(supabaseConfig)) throw new Error('Hosted Storage config must not be managed by config.toml in the free-tier release flow')
if (!/schemas\s*=\s*\["public",\s*"graphql_public"\]/.test(supabaseConfig)) throw new Error('Data API schemas should stay on the existing public/graphql_public set')
if (!/\[auth\.mfa\.totp\][\s\S]*enroll_enabled\s*=\s*true[\s\S]*verify_enabled\s*=\s*true/.test(supabaseConfig)) throw new Error('Supabase auth reference must keep TOTP MFA enabled')
if (!/\[auth\.email\][\s\S]*enable_confirmations\s*=\s*true/.test(supabaseConfig)) throw new Error('Supabase auth reference must keep email confirmations enabled')
if (!/\[auth\.email\][\s\S]*secure_password_change\s*=\s*true/.test(supabaseConfig)) throw new Error('Supabase auth reference must enable secure password change')

const envExample=readFileSync(join(root,'.env.example'),'utf8')
for(const key of ['NEXT_PUBLIC_LEGAL_NAME','NEXT_PUBLIC_PRIVACY_EMAIL','NEXT_PUBLIC_SECURITY_EMAIL','NEXT_PUBLIC_ACCESSIBILITY_EMAIL']) if(!envExample.includes(`${key}=`)) throw new Error(`Missing production public operator setting ${key}`)

const guestRights = readFileSync(join(root, 'src/app/guest-rights/page.tsx'), 'utf8')
if (!guestRights.includes('challenge') || !guestRights.includes('correction')) throw new Error('Public guest-rights page must explain guest challenge/correction rights')
const guestPortal = readFileSync(join(root, 'src/app/guest-portal/[token]/page.tsx'), 'utf8')
if (!guestPortal.includes('/api/guest-portal/dispute') || !guestPortal.includes('Challenge / correction request')) throw new Error('Guest portal must retain record-level dispute submission controls')

const appLayout=readFileSync(join(root,'src/app/(app)/layout.tsx'),'utf8')
if(!appLayout.includes('robots')||!appLayout.includes('POLICY_VERSION'))throw new Error('Authenticated application must remain noindex and policy-version gated')

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
if (wrangler.workers_dev !== true) throw new Error('workers.dev must remain enabled for the production GuestAtlas Worker')

console.log(`GuestAtlas production source check passed (${files.length} files scanned).`)
