'use client'
import { useState } from 'react'

export function GuestAccessLinkCreator({guestId}:{guestId:string}){
  const[link,setLink]=useState('')
  const[error,setError]=useState('')
  const[loading,setLoading]=useState(false)
  async function create(){
    setLoading(true);setError('');setLink('')
    try{
      const r=await fetch('/api/guest-access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({guestId})})
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Could not create guest access link')
      setLink(data.link)
    }catch(e){setError(e instanceof Error?e.message:'Could not create guest access link')}finally{setLoading(false)}
  }
  return <div className="simpleForm" style={{padding:0}}>{error&&<p className="error" role="alert">{error}</p>}{link?<><label>New guest access URL<input readOnly value={link} onFocus={e=>e.currentTarget.select()}/></label><div className="notice">Copy this link now. GuestAtlas stores only a hash of the bearer credential and cannot display the raw link again.</div></>:<button type="button" className="primary" onClick={create} disabled={loading}>{loading?'Creating…':'Create 7-day access link'}</button>}</div>
}
