import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/privacy', '/terms', '/acceptable-use', '/cookies', '/accessibility', '/security', '/guest-rights'],
      disallow: ['/api/', '/auth/', '/dashboard', '/guests', '/stays', '/feedback', '/incidents', '/moderation', '/disputes', '/audit', '/retention', '/team', '/settings', '/platform', '/guest-portal/', '/guest-access/', '/join/', '/mfa', '/onboarding', '/forgot-password', '/reset-password', '/policy-acceptance', '/verification'],
    }],
    sitemap: `${base}/sitemap.xml`,
  }
}
