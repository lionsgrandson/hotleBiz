'use client'
import { useSearchParams } from 'next/navigation'
export function ErrorBanner(){const p=useSearchParams();const error=p.get('error');return error?<div className="error globalError" role="alert">{error}</div>:null}
