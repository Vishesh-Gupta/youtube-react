// Production server: the API plus the built frontend. `pnpm build && pnpm start`.
import { serve } from '@hono/node-server'

import { createApp } from './app.ts'

const port = Number(process.env.PORT ?? 8787)
const apiKey = process.env.YOUTUBE_API_KEY || undefined
const app = createApp({ apiKey, dist: new URL('../dist', import.meta.url).pathname })

const server = serve(
  { fetch: app.fetch, port, hostname: process.env.HOST ?? '0.0.0.0' },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`)
    if (!apiKey) console.log('No YOUTUBE_API_KEY set: searches show the sample videos.')
  },
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
