'use client'
import { useState } from 'react'
import Link from 'next/link'

export function SearchForm({ networkEnabled = true }: { networkEnabled?: boolean }) {
  const [results, setResults] = useState<any[] | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [purpose, setPurpose] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(''); setResults(null)
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>
    setPurpose(payload.purpose || '')
    const res = await fetch('/api/search', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error || 'Search failed'); return }
    setResults(data.results || [])
  }
  if (!networkEnabled) return <section className="card panel"><span className="eyebrow">Verification pending</span><h2>Network lookup is locked</h2><p>Guest-data processing is locked until a platform administrator verifies the property. Team setup remains available while verification is pending.</p><Link className="secondary" href="/team">Manage team</Link></section>
  return <>
    <form onSubmit={submit} className="card formGrid">
      <div className="formHeading"><div><span className="eyebrow">Exact-match lookup</span><h2>Find a guest safely</h2></div><span className="privacyChip">Every search is audited</span></div>
      <label>Passport or national ID<input name="document" placeholder="Exact document number" /></label>
      <label>Email<input name="email" type="email" placeholder="guest@example.com" /></label>
      <label>Phone<input name="phone" placeholder="+972..." /></label>
      <label>Full legal name<input name="fullName" placeholder="Full name" /></label>
      <label>Date of birth<input name="dateOfBirth" type="date" /></label>
      <label className="span2">Business purpose<textarea name="purpose" required minLength={8} placeholder="Example: identity and safety review for reservation ABC-123" /></label>
      <div className="span2 actions"><button className="primary" disabled={loading}>{loading ? 'Searching…' : 'Search network'}</button><Link className="secondary" href="/guests/new">Create guest record</Link></div>
      {error && <p className="error span2">{error}</p>}
    </form>
    {results && <section className="results card"><div className="formHeading"><h2>Matches</h2><span>{results.length}</span></div>{results.length === 0 ? <p>No exact strong match found.</p> : results.map(r => <Link className="resultRow" key={r.id} href={`/guests/${r.id}?purpose=${encodeURIComponent(purpose || 'audited exact-match lookup')}`}><div><strong>{r.legalName}</strong><span>{r.countryCode || '—'} · {r.identifiers.join(' · ')}</span></div><div className="resultScore"><strong>{r.reputation.score ?? '—'}</strong><span>score</span></div></Link>)}</section>}
  </>
}
