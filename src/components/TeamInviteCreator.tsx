'use client'
import { useState } from 'react'

export function TeamInviteCreator(){
  const[email,setEmail]=useState('')
  const[role,setRole]=useState('viewer')
  const[link,setLink]=useState('')
  const[message,setMessage]=useState('')
  const[error,setError]=useState('')
  const[loading,setLoading]=useState(false)
  async function submit(e:React.FormEvent){
    e.preventDefault();setLoading(true);setError('');setLink('');setMessage('')
    try{
      const r=await fetch('/api/team/invite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,role})})
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Could not create invitation')
      setLink(data.url);setMessage(data.emailSent?'Invitation email sent.':'Invitation created. Copy the link and send it through a trusted channel.')
    }catch(e){setError(e instanceof Error?e.message:'Could not create invitation')}finally{setLoading(false)}
  }
  return <form className="card simpleForm" onSubmit={submit}><span className="eyebrow">Invite staff</span>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}<label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="viewer">Viewer · search/read only</option><option value="reviewer">Reviewer · add stays/feedback/incidents</option><option value="manager">Manager · review incidents/disputes</option><option value="admin">Admin · manage staff</option></select></label><button className="primary" disabled={loading}>{loading?'Creating…':'Create invitation'}</button>{link&&<label>One-time invitation URL<input readOnly value={link} onFocus={e=>e.currentTarget.select()}/></label>}</form>
}
