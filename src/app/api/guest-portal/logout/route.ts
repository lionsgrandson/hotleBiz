import { NextResponse } from 'next/server'
import { assertSameOrigin, fail } from '@/lib/http'

export async function POST(request:Request){
  try{
    assertSameOrigin(request)
    const res=NextResponse.redirect(new URL('/guest-rights',request.url),303)
    res.cookies.set('guestatlas_guest_access','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:0})
    return res
  }catch(e){return fail(e,request)}
}
