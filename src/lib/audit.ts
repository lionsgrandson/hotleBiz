import { headers } from 'next/headers'
import { auditHash } from '@/lib/crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function audit(admin: SupabaseClient, args: {
  hotelId?: string | null
  userId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  purpose?: string | null
  metadata?: Record<string, unknown>
}) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const ua = h.get('user-agent') || 'unknown'
  const { error } = await admin.from('audit_logs').insert({
    hotel_id: args.hotelId || null,
    user_id: args.userId || null,
    action: args.action,
    target_type: args.targetType || null,
    target_id: args.targetId || null,
    purpose: args.purpose || null,
    metadata: args.metadata || {},
    ip_hash: auditHash(ip),
    user_agent_hash: auditHash(ua),
  })
  if (error) throw new Error(`Audit log write failed: ${error.message}`)
}
