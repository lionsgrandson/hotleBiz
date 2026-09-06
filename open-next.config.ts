import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// GuestAtlas is mostly authenticated/dynamic. Static assets are served by Cloudflare,
// while application data remains uncached unless a route opts into Next.js caching.
export default defineCloudflareConfig()
