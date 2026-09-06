import { NextResponse } from 'next/server'
import { getHotelContext, hasRequiredMfa, type HotelRole } from '@/lib/auth'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export function assertSameOrigin(request: Request) {
  const expected = new URL(request.url).origin
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  if (origin && origin !== expected) throw new ApiError(403, 'Cross-site request rejected')
  if (!origin && referer && new URL(referer).origin !== expected) throw new ApiError(403, 'Cross-site request rejected')
}

export async function apiContext(request?: Request, roles?: HotelRole[]) {
  if (request) assertSameOrigin(request)
  if (!await hasRequiredMfa()) throw new ApiError(403, 'Multi-factor authentication is required. Open /mfa to continue.')
  const context = await getHotelContext()
  if (!context) throw new ApiError(401, 'Authentication required')
  if (!context.hotel || !context.membership) throw new ApiError(409, 'Hotel onboarding required')
  if (roles && !roles.includes(context.membership.role as HotelRole)) throw new ApiError(403, 'Insufficient permissions')
  return context as any
}

export async function body(request: Request) {
  const type = request.headers.get('content-type') || ''
  if (type.includes('application/json')) return await request.json()
  const form = await request.formData()
  return Object.fromEntries(form.entries())
}

export function ok(data: unknown, status = 200) { return NextResponse.json(data, { status }) }
export function fail(error: unknown, request?: Request) {
  if (!(error instanceof ApiError)) console.error('Unhandled application error:', error)
  const e = error instanceof ApiError
    ? error
    : new ApiError(500, process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Unexpected server error')
  const contentType = request?.headers.get('content-type') || ''
  if (request && !contentType.includes('application/json') && request.method !== 'GET') {
    const origin = new URL(request.url).origin
    const ref = request.headers.get('referer')
    const target = ref && new URL(ref).origin === origin ? new URL(ref) : new URL('/dashboard', origin)
    target.searchParams.set('error', e.message)
    return NextResponse.redirect(target, 303)
  }
  return NextResponse.json({ error: e.message }, { status: e.status })
}

export function requiredString(v: unknown, label: string, max = 500) {
  if (typeof v !== 'string' || !v.trim()) throw new ApiError(400, `${label} is required`)
  if (v.trim().length > max) throw new ApiError(400, `${label} is too long`)
  return v.trim()
}

export function optionalString(v: unknown, max = 5000) {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' || v.length > max) throw new ApiError(400, 'Invalid text value')
  return v.trim()
}

export function integerIn(v: unknown, min: number, max: number, label: string) {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(400, `${label} must be between ${min} and ${max}`)
  return n
}

export async function mustDb<T = any>(operation: PromiseLike<T>): Promise<T> {
  const result: any = await operation
  if (result?.error) throw result.error
  return result as T
}

export function isoDate(v: unknown, label: string, options: { allowFuture?: boolean } = {}) {
  const value = requiredString(v, label, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, `${label} must use YYYY-MM-DD`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new ApiError(400, `${label} is invalid`)
  if (!options.allowFuture && parsed.getTime() > Date.now()) throw new ApiError(400, `${label} cannot be in the future`)
  return value
}
