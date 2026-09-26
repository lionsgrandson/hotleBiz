import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pages = ['', '/guest-rights', '/privacy', '/terms', '/acceptable-use', '/cookies', '/accessibility', '/security']
  return pages.map((path) => ({ url: `${base}${path || '/'}`, lastModified: new Date('2026-09-26'), changeFrequency: path ? 'monthly' : 'weekly', priority: path ? 0.6 : 1 }))
}
