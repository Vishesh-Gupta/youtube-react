import { getRequestListener } from '@hono/node-server'
import type { Connect, Plugin } from 'vite'

import { createApp } from './app.ts'

/**
 * Serves the API inside Vite's dev and preview servers, so one command runs the
 * whole app. The key comes from YOUTUBE_API_KEY (environment or .env).
 */
export function apiServer(apiKey: string | undefined): Plugin {
  const listener = getRequestListener(createApp({ apiKey }).fetch)
  const api: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.startsWith('/api/')) void listener(req, res)
    else next()
  }
  return {
    name: 'api-server',
    configureServer: (server) => void server.middlewares.use(api),
    configurePreviewServer: (server) => void server.middlewares.use(api),
  }
}
