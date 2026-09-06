import { getCloudflareContext } from '@opennextjs/cloudflare'

type R2ObjectBodyLike = {
  body: ReadableStream<Uint8Array>
  httpMetadata?: { contentType?: string }
  customMetadata?: Record<string, string>
}

type R2BucketLike = {
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: {
    httpMetadata?: { contentType?: string }
    customMetadata?: Record<string, string>
  }): Promise<unknown>
  get(key: string): Promise<R2ObjectBodyLike | null>
  delete(key: string): Promise<void>
}

export function getEvidenceBucket(): R2BucketLike {
  const context = getCloudflareContext()
  const bucket = (context.env as unknown as { EVIDENCE_BUCKET?: R2BucketLike }).EVIDENCE_BUCKET
  if (!bucket) throw new Error('Cloudflare EVIDENCE_BUCKET binding is missing')
  return bucket
}

export const R2_EVIDENCE_PREFIX = 'r2/'

export function isR2EvidencePath(path: string) {
  return path.startsWith(R2_EVIDENCE_PREFIX)
}
