import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Next.js 16 renamed Middleware to Node.js Proxy, but OpenNext Cloudflare does
// not yet support proxy.ts. Next.js 16 explicitly retains middleware.ts for
// Edge-runtime use cases, which is sufficient for Supabase SSR cookie refresh.
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
