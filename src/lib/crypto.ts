import crypto from 'crypto'

function encryptionKey() {
  const raw = process.env.PII_ENCRYPTION_KEY
  if (!raw) throw new Error('PII_ENCRYPTION_KEY missing')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('PII_ENCRYPTION_KEY must be exactly 32 bytes in base64')
  return key
}

export function encryptPII(value?: string | null) {
  if (!value) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptPII(value?: string | null) {
  if (!value) return null
  const [version, ivB64, tagB64, dataB64] = value.split('.')
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted payload')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8')
}

export function normalizeText(v: string) {
  return v.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function normalizePhone(v: string) {
  return v.replace(/[^0-9+]/g, '').replace(/^00/, '+')
}

export function normalizeEmail(v: string) {
  return v.trim().toLowerCase()
}

export function normalizeDocument(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function hmacMatch(type: string, normalizedValue: string) {
  const secret = process.env.MATCHING_SECRET
  if (!secret) throw new Error('MATCHING_SECRET missing')
  return crypto.createHmac('sha256', secret).update(`${type}:${normalizedValue}`).digest('hex')
}

export function auditHash(value: string) {
  const secret = process.env.AUDIT_HASH_SECRET || process.env.MATCHING_SECRET
  if (!secret) throw new Error('AUDIT_HASH_SECRET missing')
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function maskIdentifier(value: string, keep = 4) {
  const clean = value.trim()
  if (clean.length <= keep) return '*'.repeat(clean.length)
  return `${'*'.repeat(Math.min(8, clean.length - keep))}${clean.slice(-keep)}`
}
