// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import popular from './fixtures/popular.json' with { type: 'json' }
import search from './fixtures/search.json' with { type: 'json' }
import { YouTubeError, createYouTubeClient, decodeEntities } from './youtube.ts'

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => Response.json(body, { status }))

describe('decodeEntities', () => {
  it('undoes the HTML escaping in search results', () => {
    expect(decodeEntities('Rock &amp; Roll &quot;Live&quot; Don&#39;t &#x2014; &lt;3')).toBe(
      'Rock & Roll "Live" Don\'t — <3',
    )
    expect(decodeEntities('&unknown; stays')).toBe('&unknown; stays')
  })
})

describe('YouTube client', () => {
  it('searches embeddable videos and flattens the results', async () => {
    const fetchMock = respond(search)
    const page = await createYouTubeClient('KEY', fetchMock).search('blender', 'CAoQAA')
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/youtube/v3/search')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      part: 'snippet',
      type: 'video',
      q: 'blender',
      videoEmbeddable: 'true',
      pageToken: 'CAoQAA',
      key: 'KEY',
    })
    expect(page.nextPageToken).toBe('CBQQAA')
    expect(page.items[0]).toEqual({
      id: 'eRsGyueVLvQ',
      title: 'Sintel - Open Movie by Blender Foundation',
      description:
        '"Sintel" is an independently produced short film, initiated by the Blender Foundation.',
      channelId: 'UCSMOQeBJ2RAnuFungnQOxLg',
      channelTitle: 'Blender',
      publishedAt: '2010-09-30T10:00:00Z',
      thumbnail: {
        url: 'https://i.ytimg.com/vi/eRsGyueVLvQ/mqdefault.jpg',
        width: 320,
        height: 180,
      },
    })
    // Falls back to the small thumbnail when there's no medium one.
    expect(page.items[1]).toMatchObject({
      title: 'Caminandes 3: Llamigos & friends',
      description: "Koro's third adventure.",
      thumbnail: { width: 120, height: 90 },
    })
  })

  it('lists popular videos for an empty search, at a fraction of the quota', async () => {
    const fetchMock = respond(popular)
    const page = await createYouTubeClient('KEY', fetchMock).popular()
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/youtube/v3/videos')
    expect(url.searchParams.get('chart')).toBe('mostPopular')
    expect(page).toEqual({
      items: [expect.objectContaining({ id: 'aqz-KE-bpKQ' })],
      nextPageToken: null,
    })
  })

  it('explains quota and key errors without the key', async () => {
    const quota = respond({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } }, 403)
    await expect(createYouTubeClient('SECRET', quota).search('x')).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('allowance is used up'),
    })
    const badKey = respond(
      { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } },
      400,
    )
    await expect(createYouTubeClient('SECRET', badKey).search('x')).rejects.toMatchObject({
      status: 500,
      message: "YouTube rejected the server's API key.",
    })
  })

  it('never puts the request URL, and so the key, in network errors', async () => {
    const failing = vi.fn(async (url: URL) => {
      throw new TypeError(`fetch failed for ${url}`)
    })
    const error = await createYouTubeClient('SECRET', failing as unknown as typeof fetch)
      .search('x')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(YouTubeError)
    expect((error as YouTubeError).message).toBe("Couldn't reach YouTube.")
    expect(String(error)).not.toContain('SECRET')
  })
})
