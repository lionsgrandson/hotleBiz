'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MfaGate() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [hasFactor, setHasFactor] = useState(false)

  useEffect(() => {
    void (async () => {
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal.error) { setError(aal.error.message); setLoading(false); return }
      if (aal.data.currentLevel === 'aal2') { router.replace('/dashboard'); return }

      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) { setError(factors.error.message); setLoading(false); return }
      const verified = factors.data?.totp?.find((f: any) => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setHasFactor(true)
      } else {
        // An abandoned enrollment cannot be resumed because the TOTP secret is not returned again.
        // Remove stale unverified factors so repeated setup attempts do not accumulate unusable entries.
        for (const factor of factors.data?.totp?.filter((f: any) => f.status === 'unverified') || []) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }
      setLoading(false)
    })()
  }, [router, supabase])

  async function enroll() {
    setError('')
    const r = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'GuestAtlas authenticator' })
    if (r.error) { setError(r.error.message); return }
    setFactorId(r.data.id)
    setQr(r.data.totp.qr_code)
    setSecret(r.data.totp.secret)
  }

  async function verify() {
    setError('')
    if (!factorId || code.trim().length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    const c = await supabase.auth.mfa.challenge({ factorId })
    if (c.error) { setError(c.error.message); return }
    const v = await supabase.auth.mfa.verify({ factorId, challengeId: c.data.id, code: code.trim() })
    if (v.error) { setError(v.error.message); return }
    router.replace('/dashboard')
    router.refresh()
  }

  if (loading) return <p>Checking security status…</p>
  return <div className="card loginBox">
    <span className="eyebrow">Required security</span><h2>Two-factor authentication</h2>
    {error && <p className="error">{error}</p>}
    {!factorId && !qr && <><p>GuestAtlas contains sensitive guest records, so staff accounts require an authenticator app before access is granted.</p><button className="primary" onClick={enroll}>Set up authenticator</button></>}
    {qr && <><p>Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password, Authy, or another TOTP app.</p><img src={qr} alt="Authenticator QR code" style={{width:220,maxWidth:'100%',background:'white',padding:10,borderRadius:12}}/><label>Manual secret<input readOnly value={secret}/></label></>}
    {hasFactor && <p>Enter the current code from your enrolled authenticator.</p>}
    {factorId && <><label>6-digit code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><button className="primary" onClick={verify}>Verify and continue</button></>}
  </div>
}
