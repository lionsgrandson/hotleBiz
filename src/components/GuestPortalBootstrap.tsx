'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export function GuestPortalBootstrap(){
  const[status,setStatus]=useState('Checking access link…')
  const[failed,setFailed]=useState(false)
  useEffect(()=>{
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,''))
    const token=hash.get('access')
    if(!token){setStatus('Open the private GuestAtlas link supplied by the participating property.');setFailed(true);return}
    void (async()=>{
      try{
        const r=await fetch('/api/guest-portal/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})})
        const data=await r.json()
        if(!r.ok)throw new Error(data.error||'Access link is invalid or expired')
        history.replaceState(null,'','/guest-portal')
        location.reload()
      }catch(e){history.replaceState(null,'','/guest-portal');setStatus(e instanceof Error?e.message:'Access link is invalid or expired');setFailed(true)}
    })()
  },[])
  return <main className="loginPanel" style={{minHeight:'100vh'}}><section className="card loginBox"><span className="eyebrow">GuestAtlas personal data access</span><h2>{failed?'Private access required':'Opening your private record'}</h2><p>{status}</p>{failed&&<p><Link href="/guest-rights">Guest access instructions</Link></p>}</section></main>
}
