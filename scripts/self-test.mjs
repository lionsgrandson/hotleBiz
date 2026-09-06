import crypto from 'node:crypto'
import assert from 'node:assert/strict'

process.env.PII_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64')
process.env.MATCHING_SECRET ||= crypto.randomBytes(64).toString('hex')
process.env.AUDIT_HASH_SECRET ||= crypto.randomBytes(64).toString('hex')

const scoring = await import('../src/lib/scoring.ts')
const security = await import('../src/lib/crypto.ts')

const weighted = scoring.calculateWeightedRating({
  cleanliness: 5,
  property_care: 1,
  staff_respect: 2,
  noise: 2,
  payment: 2,
  policy_compliance: 2,
})
assert.equal(weighted, 2.4, 'weighted score must use the configured dimension weights')

const reputation = scoring.calculateReputation(Array.from({ length: 3 }, () => ({
  cleanliness: 5,
  property_care: 5,
  staff_respect: 5,
  noise: 5,
  payment: 5,
  policy_compliance: 5,
  would_host_again: true,
})))
assert.equal(reputation.score, 100)
assert.equal(reputation.confidence, 'medium')
assert.equal(reputation.rebookRate, 1)

const plaintext = 'Guest Example 123'
const ciphertext = security.encryptPII(plaintext)
assert.ok(ciphertext && ciphertext !== plaintext)
assert.equal(security.decryptPII(ciphertext), plaintext)
const emailA = security.hmacMatch('email', security.normalizeEmail(' Test@Example.com '))
const emailB = security.hmacMatch('email', security.normalizeEmail('test@example.com'))
const differentDomain = security.hmacMatch('phone', security.normalizeEmail('test@example.com'))
assert.equal(emailA, emailB, 'email normalization must be deterministic')
assert.notEqual(emailA, differentDomain, 'identifier type must domain-separate matching HMACs')
assert.equal(security.tokenHash('abc'), security.tokenHash('abc'))
assert.notEqual(security.randomToken(), security.randomToken())

console.log('GuestAtlas scoring and cryptography self-tests passed.')
