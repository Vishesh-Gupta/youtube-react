import type { Connect, Plugin } from 'vite'

import type { SearchPage } from '../src/api/types.ts'
import { searchDemo } from './videos.ts'

/** Answers /api/search from the sample videos, for development and previews. */
export function demoApi(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/api/search') return next()
    const page: SearchPage = {
      items: searchDemo(url.searchParams.get('q') ?? ''),
      nextPageToken: null,
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(page))
  }
  return {
    name: 'demo-api',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  }
}
