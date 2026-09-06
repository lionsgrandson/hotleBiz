import { getHotelContext, isPlatformAdmin, hasRequiredMfa } from '@/lib/auth'
import { ApiError, fail } from '@/lib/http'
import { audit } from '@/lib/audit'
import { decryptPII } from '@/lib/crypto'
import { getEvidenceBucket, isR2EvidencePath } from '@/lib/cloudflare'

function downloadHeaders(file: any, fallbackContentType?: string) {
  let name = 'evidence'
  try { name = decryptPII(file.file_name_cipher) || name } catch {}
  name = name.replace(/[\r\n]/g, '').slice(0, 240) || 'evidence'
  const headers = new Headers({
    'Content-Type': file.mime_type || fallbackContentType || 'application/octet-stream',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  })
  if (file.size_bytes) headers.set('Content-Length', String(file.size_bytes))
  return headers
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await hasRequiredMfa()) throw new ApiError(403, 'MFA required')
    const ctx = await getHotelContext()
    if (!ctx?.hotel) throw new ApiError(401, 'Authentication required')
    const { id } = await params
    const { data: file, error } = await ctx.admin.from('evidence_files').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!file) throw new ApiError(404, 'Evidence not found')

    const platform = await isPlatformAdmin(ctx.user.id)
    if (file.hotel_id !== ctx.hotel.id && !platform) throw new ApiError(403, 'Raw evidence is restricted to the source property and platform administrators')
    if (!platform && ctx.membership.role === 'viewer') throw new ApiError(403, 'Raw evidence requires reviewer, manager, admin, or owner access')

    let response: Response
    if (isR2EvidencePath(file.storage_path)) {
      const object = await getEvidenceBucket().get(file.storage_path)
      if (!object) throw new ApiError(404, 'Evidence object not found')
      response = new Response(object.body, { status: 200, headers: downloadHeaders(file, object.httpMetadata?.contentType) })
    } else {
      // Backward compatibility for evidence uploaded before the Cloudflare R2 migration.
      const legacy = await ctx.admin.storage.from('incident-evidence').download(file.storage_path)
      if (legacy.error || !legacy.data) throw new ApiError(404, 'Legacy evidence object not found')
      response = new Response(legacy.data.stream(), { status: 200, headers: downloadHeaders(file, legacy.data.type) })
    }

    await audit(ctx.admin, { hotelId: ctx.hotel.id, userId: ctx.user.id, action: 'evidence_downloaded', targetType: 'evidence_file', targetId: id, purpose: 'incident evidence review', metadata: { storageBackend: isR2EvidencePath(file.storage_path) ? 'cloudflare-r2' : 'legacy-supabase-storage' } })
    return response
  } catch (e) {
    return fail(e, request)
  }
}
