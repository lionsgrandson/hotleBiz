interface Env {
  APP_URL: string
  CRON_SECRET: string
}

async function runRetention(env: Env) {
  const endpoint = new URL('/api/cron/retention', env.APP_URL)
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${env.CRON_SECRET}`,
      'user-agent': 'GuestAtlas-Cloudflare-Maintenance/1.0',
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Retention job failed: HTTP ${response.status}${text ? ` - ${text.slice(0, 500)}` : ''}`)
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runRetention(env))
  },
  async fetch(_request: Request) {
    return Response.json({ service: 'guestatlas-maintenance', ok: true })
  },
}
