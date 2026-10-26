import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getConnInfo } from '@hono/node-server/conninfo'
import { serveStatic } from '@hono/node-server/serve-static'
import { type Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { searchDemo } from '../demo/videos.ts'
import type { SearchPage } from '../src/api/types.ts'
import { ResultCache } from './cache.ts'
import { RateLimiter } from './rateLimit.ts'
import { YouTubeError, createYouTubeClient } from './youtube.ts'

export interface AppOptions {
  /** YouTube Data API key; without one, searches answer from the sample videos. */
  apiKey?: string
  /** The built frontend to serve, if any. */
  dist?: string
  fetch?: typeof fetch
  now?: () => number
  /** Searches allowed per visitor per minute. */
  searchesPerMinute?: number
}

/** The visitor's address, for rate limiting; requests made in-process (tests) have none. */
function clientAddress(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

const MAX_QUERY = 200
const PAGE_TOKEN = /^[\w-]{1,100}$/

export function createApp(options: AppOptions = {}) {
  const { apiKey, dist, now = Date.now } = options
  const youtube = apiKey ? createYouTubeClient(apiKey, options.fetch) : null
  // Results for a query barely change within an hour, and each search costs 100 quota units.
  const cache = new ResultCache<Omit<SearchPage, 'source'>>(500, 60 * 60_000, now)
  const limiter = new RateLimiter(options.searchesPerMinute ?? 30, 60_000, now)

  const app = new Hono()

  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://i.ytimg.com'],
        frameSrc: ['https://www.youtube-nocookie.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
      // The embedded player is a cross-origin frame without CORP headers.
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.get('/api/health', (c) => c.json({ ok: true, youtube: Boolean(youtube) }))

  app.get('/api/search', async (c) => {
    const query = (c.req.query('q') ?? '').trim()
    const page = c.req.query('page')
    if (query.length > MAX_QUERY) return c.json({ error: 'That search is too long.' }, 400)
    if (page !== undefined && !PAGE_TOKEN.test(page))
      return c.json({ error: 'That page of results is not valid.' }, 400)

    if (!youtube) {
      const items = searchDemo(query)
      return c.json<SearchPage>({ items, nextPageToken: null, source: 'demo' })
    }

    if (!limiter.allow(clientAddress(c)))
      return c.json({ error: 'Too many searches. Wait a minute and try again.' }, 429)

    const key = `${query.toLowerCase()}\u0000${page ?? ''}`
    try {
      // An empty search shows what's popular, which costs 1 quota unit rather than 100.
      const result = await cache.get(key, () =>
        query ? youtube.search(query, page) : youtube.popular(page),
      )
      c.header('Cache-Control', 'public, max-age=300')
      return c.json<SearchPage>({ ...result, source: 'youtube' })
    } catch (error) {
      if (error instanceof YouTubeError)
        return c.json({ error: error.message }, error.status as 400 | 500 | 502 | 503)
      throw error
    }
  })

  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

  if (dist && existsSync(join(dist, 'index.html'))) {
    const index = readFileSync(join(dist, 'index.html'), 'utf8')
    // Built files are named by content, so they never change.
    app.use('/assets/*', async (c, next) => {
      await next()
      if (c.res.ok) c.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    })
    // Pages always revalidate, so a deploy reaches visitors at once.
    app.use('*', async (c, next) => {
      await next()
      if (c.res.headers.get('Content-Type')?.startsWith('text/html'))
        c.res.headers.set('Cache-Control', 'no-cache')
    })
    app.use('*', serveStatic({ root: dist }))
    // A missing build file is a 404, never the page (which would then be cached as the file).
    app.get('/assets/*', (c) => c.text('Not found', 404))
    // Any other path is a page of the app.
    app.get('*', (c) => c.html(index))
  }

  return app
}
