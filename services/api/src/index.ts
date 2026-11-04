import { serve } from '@hono/node-server'
import { Hono } from 'hono'

/**
 * Local / Render skeleton — not wired to the Next.js app yet.
 * Next week: move Server Action / Prisma paths behind this process.
 */
const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3001)
const hostname = process.env.HOSTNAME ?? '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`mathz-api listening on http://${info.address}:${info.port}`)
})
