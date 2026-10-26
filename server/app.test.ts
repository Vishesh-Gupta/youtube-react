// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { createApp } from './app.ts'
import search from './fixtures/search.json' with { type: 'json' }

const youtube = () => vi.fn<typeof fetch>(async () => Response.json(search))

describe('API without a key', () => {
  it('answers from the sample videos', async () => {
    const response = await createApp().request('/api/search?q=llama')
    const body = await response.json()
    expect(body.source).toBe('demo')
    expect(body.items).toHaveLength(2)
    expect(await (await createApp().request('/api/health')).json()).toEqual({
      ok: true,
      youtube: false,
    })
  })
})

describe('API with a key', () => {
  it('searches YouTube and caches the answer', async () => {
    const fetchMock = youtube()
    const app = createApp({ apiKey: 'KEY', fetch: fetchMock })
    const first = await app.request('/api/search?q=Blender')
    expect(first.status).toBe(200)
    expect(first.headers.get('cache-control')).toBe('public, max-age=300')
    const body = await first.json()
    expect(body).toMatchObject({ source: 'youtube', nextPageToken: 'CBQQAA' })
    expect(body.items).toHaveLength(2)
    // Same search, different case: served from the cache.
    await app.request('/api/search?q=blender')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares one request between simultaneous identical searches', async () => {
    const fetchMock = youtube()
    const app = createApp({ apiKey: 'KEY', fetch: fetchMock })
    await Promise.all([app.request('/api/search?q=a'), app.request('/api/search?q=a')])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('passes on YouTube errors in plain words, and tries again next time', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 }),
      )
      .mockResolvedValueOnce(Response.json(search))
    const app = createApp({ apiKey: 'KEY', fetch: fetchMock })
    const failed = await app.request('/api/search?q=x')
    expect(failed.status).toBe(503)
    expect((await failed.json()).error).toMatch(/allowance is used up/)
    expect((await app.request('/api/search?q=x')).status).toBe(200)
  })

  it('limits searches per visitor', async () => {
    const app = createApp({ apiKey: 'KEY', fetch: youtube(), searchesPerMinute: 2 })
    expect((await app.request('/api/search?q=1')).status).toBe(200)
    expect((await app.request('/api/search?q=2')).status).toBe(200)
    const limited = await app.request('/api/search?q=3')
    expect(limited.status).toBe(429)
    expect((await limited.json()).error).toMatch(/Too many searches/)
  })

  it('rejects malformed requests before spending quota', async () => {
    const fetchMock = youtube()
    const app = createApp({ apiKey: 'KEY', fetch: fetchMock })
    expect((await app.request(`/api/search?q=${'x'.repeat(201)}`)).status).toBe(400)
    expect((await app.request('/api/search?q=x&page=../../etc')).status).toBe(400)
    expect((await app.request('/api/nope')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('serving the app', () => {
  const dist = mkdtempSync(join(tmpdir(), 'dist-'))
  mkdirSync(join(dist, 'assets'))
  writeFileSync(join(dist, 'index.html'), '<!doctype html><div id="root"></div>')
  writeFileSync(join(dist, 'assets', 'index-abc.js'), 'console.log(1)')
  const app = createApp({ dist })

  it('serves built files, caching hashed ones for good', async () => {
    const asset = await app.request('/assets/index-abc.js')
    expect(asset.status).toBe(200)
    expect(asset.headers.get('cache-control')).toContain('immutable')
    const missing = await app.request('/assets/index-old.js')
    expect(missing.status).toBe(404)
    expect(missing.headers.get('cache-control')).toBeNull()
  })

  it('answers any other path with the app, under a strict CSP', async () => {
    const page = await app.request('/watch/anything')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('<div id="root">')
    expect(page.headers.get('cache-control')).toBe('no-cache')
    expect((await app.request('/')).headers.get('cache-control')).toBe('no-cache')
    const csp = page.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('frame-src https://www.youtube-nocookie.com')
    expect(csp).toContain('img-src')
  })
})
