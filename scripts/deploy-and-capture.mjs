import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const secretsFile = process.argv[2] || '.cloudflare.secrets.tmp.json'
const logFile = process.argv[3] || '.guestatlas-first-deploy.log'
const cli = resolve('node_modules/@opennextjs/cloudflare/dist/cli/index.js')

if (!existsSync(cli)) {
  console.error(`OpenNext Cloudflare CLI was not found at ${cli}. Run npm install first.`)
  process.exit(1)
}

const log = createWriteStream(logFile, { flags: 'w', mode: 0o600 })
const child = spawn(process.execPath, [cli, 'deploy', '--secrets-file', secretsFile], {
  stdio: ['inherit', 'pipe', 'pipe'],
  windowsHide: false,
  shell: false,
  env: process.env,
})

let settled = false
function finish(code) {
  if (settled) return
  settled = true
  log.end(() => {
    if (code !== 0) process.exitCode = code || 1
  })
}

for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
  stream.on('data', (chunk) => {
    target.write(chunk)
    log.write(chunk)
  })
}

child.on('error', (error) => {
  console.error(`Failed to start Cloudflare deploy: ${error.message}`)
  finish(1)
})

child.on('close', (code) => {
  if (code !== 0) console.error(`Cloudflare deploy exited with code ${code}.`)
  finish(code ?? 1)
})
