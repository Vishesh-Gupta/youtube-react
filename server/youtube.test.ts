// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { googleApi, resources } from './testing.ts'
import { YouTubeError, createYouTubeClient, decodeEntities } from './youtube.ts'

const failWith = (body: unknown, status: number) => () => Response.json(body, { status })

describe('decodeEntities', () => {
  it('undoes the HTML escaping in search results', () => {
    expect(decodeEntities('Rock &amp; Roll &quot;Live&quot; Don&#39;t &#x2014; &lt;3')).toBe(
      'Rock & Roll "Live" Don\'t — <3',
    )
    expect(decodeEntities('&unknown; stays')).toBe('&unknown; stays')
  })
})

describe('YouTube client', () => {
  it('searches embeddable videos, then fetches their durations and views in one call', async () => {
    const fetchMock = googleApi()
    const page = await createYouTubeClient('KEY', fetchMock).search('blender', 'CAoQAA')
    expect(resources(fetchMock)).toEqual(['search', 'videos'])
    const [searchUrl, videosUrl] = fetchMock.mock.calls.map(([u]) => new URL(String(u)))
    expect(Object.fromEntries(searchUrl!.searchParams)).toMatchObject({
      part: 'snippet',
      type: 'video',
      q: 'blender',
      videoEmbeddable: 'true',
      pageToken: 'CAoQAA',
      key: 'KEY',
    })
    expect(videosUrl!.searchParams.get('id')).toBe('eRsGyueVLvQ,SkVqJ1SGeL0')
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
      duration: 'PT14M48S',
      viewCount: 24719402,
    })
    // Falls back to the small thumbnail when there's no medium one.
    expect(page.items[1]).toMatchObject({ thumbnail: { width: 120, height: 90 } })
  })

  it('lists popular videos for an empty search in one call', async () => {
    const fetchMock = googleApi()
    const page = await createYouTubeClient('KEY', fetchMock).popular()
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(resources(fetchMock)).toEqual(['videos'])
    expect(url.searchParams.get('chart')).toBe('mostPopular')
    expect(page).toEqual({
      items: [expect.objectContaining({ id: 'aqz-KE-bpKQ' })],
      nextPageToken: null,
    })
  })

  it('gives one video’s details, with hidden counts as null', async () => {
    const client = createYouTubeClient('KEY', googleApi())
    expect(await client.details('eRsGyueVLvQ')).toMatchObject({
      likeCount: 251000,
      commentCount: 17500,
      duration: 'PT14M48S',
    })
    const hidden = await createYouTubeClient(
      'KEY',
      googleApi({
        videos: () =>
          Response.json({
            items: [
              {
                id: 'SkVqJ1SGeL0',
                snippet: {
                  title: 'x',
                  description: '',
                  channelId: 'c',
                  channelTitle: 'C',
                  publishedAt: '2016-01-01T00:00:00Z',
                  thumbnails: {},
                },
                statistics: { viewCount: '5' },
              },
            ],
          }),
      }),
    ).details('SkVqJ1SGeL0')
    expect(hidden).toMatchObject({ viewCount: 5, likeCount: null, commentCount: null })
    const missing = createYouTubeClient(
      'KEY',
      googleApi({ videos: () => Response.json({ items: [] }) }),
    )
    expect(await missing.details('aaaaaaaaaaa')).toBeNull()
  })

  it('lists a channel’s uploads cheaply, dropping videos that have gone private', async () => {
    const fetchMock = googleApi()
    const client = createYouTubeClient('KEY', fetchMock)
    const page = await client.channelVideos('UCSMOQeBJ2RAnuFungnQOxLg')
    expect(resources(fetchMock)).toEqual(['channels', 'playlistItems', 'videos'])
    expect(page.items.map((v) => v.id)).toEqual(['SkVqJ1SGeL0'])
    expect(page.nextPageToken).toBe('EAAaBlBUOkNBVQ')
    // The uploads playlist is remembered: the next page skips the channel lookup.
    await client.channelVideos('UCSMOQeBJ2RAnuFungnQOxLg', 'EAAaBlBUOkNBVQ')
    expect(resources(fetchMock).slice(3)).toEqual(['playlistItems', 'videos'])
  })

  it('says when a channel does not exist', async () => {
    const client = createYouTubeClient('KEY', googleApi({ channels: () => Response.json({}) }))
    await expect(client.channelVideos('UCaaaaaaaaaaaaaaaaaaaaaa')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('explains quota and key errors without the key', async () => {
    const quota = googleApi({
      search: failWith({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } }, 403),
    })
    await expect(createYouTubeClient('SECRET', quota).search('x')).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('allowance is used up'),
    })
    const badKey = googleApi({
      search: failWith(
        { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } },
        400,
      ),
    })
    await expect(createYouTubeClient('SECRET', badKey).search('x')).rejects.toMatchObject({
      status: 500,
      message: "YouTube rejected the server's API key.",
    })
  })

  it('never puts the request URL, and so the key, in network errors', async () => {
    const failing = vi.fn<typeof fetch>(async (url) => {
      throw new TypeError(`fetch failed for ${String(url)}`)
    })
    const error = await createYouTubeClient('SECRET', failing)
      .search('x')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(YouTubeError)
    expect((error as YouTubeError).message).toBe("Couldn't reach YouTube.")
    expect(String(error)).not.toContain('SECRET')
  })
})
