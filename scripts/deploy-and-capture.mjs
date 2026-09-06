import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'

const secretsFile = process.argv[2] || '.cloudflare.secrets.tmp.json'
const logFile = process.argv[3] || '.guestatlas-first-deploy.log'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const log = createWriteStream(logFile, { flags: 'w', mode: 0o600 })

const child = spawn(npx, ['opennextjs-cloudflare', 'deploy', '--secrets-file', secretsFile], {
  stdio: ['inherit', 'pipe', 'pipe'],
  windowsHide: false,
  shell: false,
})

for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
  stream.on('data', (chunk) => {
    target.write(chunk)
    log.write(chunk)
  })
}

child.on('error', (error) => {
  console.error(`Failed to start Cloudflare deploy: ${error.message}`)
  log.end()
  process.exitCode = 1
})

child.on('close', (code) => {
  log.end(() => {
    if (code !== 0) {
      console.error(`Cloudflare deploy exited with code ${code}.`)
      process.exitCode = code || 1
    }
  })
})
