import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const ignored = new Set(['node_modules', '.next', '.git', '.vercel'])
const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full)
    else files.push(full)
  }
}
walk(root)

const textFiles = files.filter(f => /\.(?:ts|tsx|mjs|md|json|toml|sql|cmd|example|gitignore)$/.test(f) || /(?:Dockerfile|\.env\.example|\.gitignore)$/.test(f))
const staleBrand = []
const obviousSecrets = []
for (const file of textFiles) {
  const text = readFileSync(file, 'utf8')
  const legacyBrand = new RegExp(`${'Stay' + 'Trust'}|${'stay' + 'trust'}`)
  if (legacyBrand.test(text)) staleBrand.push(relative(root, file))
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) obviousSecrets.push(relative(root, file))
}
if (staleBrand.length) throw new Error(`Old product branding remains in: ${staleBrand.join(', ')}`)
if (obviousSecrets.length) throw new Error(`Possible Supabase secret committed in: ${obviousSecrets.join(', ')}`)

const requiredFiles = [
  'supabase/migrations/202609060001_init.sql',
  'supabase/migrations/202609060002_hardening.sql',
  'src/app/api/search/route.ts',
  'src/app/api/guests/route.ts',
  'src/app/api/incidents/route.ts',
  'src/app/api/guest-portal/dispute/route.ts',
  'src/components/MfaGate.tsx',
  'proxy.ts',
]
for (const file of requiredFiles) if (!files.includes(join(root, file))) throw new Error(`Required product file missing: ${file}`)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (typeof version !== 'string' || /^[~^*><=]/.test(version) || version.includes('latest')) throw new Error(`Dependency ${name} must be exactly pinned; found ${version}`)
}
if (!String(pkg.engines?.node || '').includes('22')) throw new Error('Node 22+ engine requirement is missing')

console.log(`GuestAtlas source check passed (${files.length} files scanned).`)
