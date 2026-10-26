// A small client for the YouTube Data API v3, flattening its resources into the
// app's Video. https://developers.google.com/youtube/v3/docs
//
// Quota: a search costs 100 units of the 10,000 a day the API allows; every
// other call here costs 1. The server caches all of them (see app.ts).

import type { SearchPage, Video, VideoDetails } from '../src/api/types.ts'

const API = 'https://www.googleapis.com/youtube/v3'
const PAGE_SIZE = 20

interface Thumbnail {
  url: string
  width?: number
  height?: number
}

interface Snippet {
  publishedAt: string
  channelId: string
  title: string
  description: string
  channelTitle: string
  thumbnails: Partial<Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', Thumbnail>>
}

interface SearchListResponse {
  nextPageToken?: string
  items: { id: { kind: string; videoId?: string }; snippet: Snippet }[]
}

interface VideoResource {
  id: string
  snippet: Snippet
  contentDetails?: { duration?: string }
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
}

interface VideoListResponse {
  nextPageToken?: string
  items: VideoResource[]
}

interface ChannelListResponse {
  items?: { contentDetails: { relatedPlaylists: { uploads?: string } } }[]
}

interface PlaylistItemListResponse {
  nextPageToken?: string
  items: { snippet: Snippet & { resourceId: { videoId: string } } }[]
}

interface ErrorResponse {
  error?: { code?: number; message?: string; errors?: { reason?: string }[] }
}

/** An error safe to show the visitor: it never includes the request URL, and so never the key. */
export class YouTubeError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'YouTubeError'
    this.status = status
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

/** Search results come HTML-escaped ("Rock &amp; Roll", "Don&#39;t"); undo that. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

/** Counts arrive as strings, and are absent when the owner hides them. */
const count = (value: string | undefined) => (value === undefined ? null : Number(value))

function toVideo(id: string, snippet: Snippet, extra?: VideoResource): Video {
  const thumb = snippet.thumbnails.medium ?? snippet.thumbnails.high ?? snippet.thumbnails.default
  return {
    id,
    title: decodeEntities(snippet.title),
    description: decodeEntities(snippet.description),
    channelId: snippet.channelId,
    channelTitle: decodeEntities(snippet.channelTitle),
    publishedAt: snippet.publishedAt,
    thumbnail: {
      url: thumb?.url ?? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      width: thumb?.width ?? 320,
      height: thumb?.height ?? 180,
    },
    duration: extra?.contentDetails?.duration ?? null,
    viewCount: count(extra?.statistics?.viewCount),
  }
}

function toDetails(resource: VideoResource): VideoDetails {
  return {
    ...toVideo(resource.id, resource.snippet, resource),
    likeCount: count(resource.statistics?.likeCount),
    commentCount: count(resource.statistics?.commentCount),
  }
}

/** Turn an API error into one the visitor can understand. */
function explain(status: number, body: ErrorResponse): YouTubeError {
  const reasons = new Set((body.error?.errors ?? []).map((e) => e.reason))
  if (reasons.has('quotaExceeded') || reasons.has('dailyLimitExceeded'))
    return new YouTubeError(
      503,
      "Today's YouTube search allowance is used up. It resets at midnight Pacific time.",
    )
  if (reasons.has('keyInvalid') || body.error?.message?.includes('API key'))
    return new YouTubeError(500, "YouTube rejected the server's API key.")
  if (reasons.has('rateLimitExceeded') || status === 429)
    return new YouTubeError(503, 'YouTube is limiting requests right now. Try again shortly.')
  if (status === 404 || reasons.has('channelNotFound') || reasons.has('playlistNotFound'))
    return new YouTubeError(404, 'That channel or video was not found.')
  if (reasons.has('invalidPageToken'))
    return new YouTubeError(400, 'That page of results is no longer available.')
  return new YouTubeError(502, `YouTube returned an error (${status}).`)
}

type Page = Omit<SearchPage, 'source'>

export interface YouTubeClient {
  search(query: string, pageToken?: string): Promise<Page>
  popular(pageToken?: string): Promise<Page>
  /** Null when there's no such video (or it's private). */
  details(id: string): Promise<VideoDetails | null>
  /** A channel's uploads, newest first. */
  channelVideos(channelId: string, pageToken?: string): Promise<Page>
}

export function createYouTubeClient(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  regionCode = 'US',
): YouTubeClient {
  async function get<T>(resource: string, params: Record<string, string | undefined>): Promise<T> {
    const url = new URL(`${API}/${resource}`)
    for (const [name, value] of Object.entries(params)) if (value) url.searchParams.set(name, value)
    url.searchParams.set('key', apiKey)
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { Accept: 'application/json' } })
    } catch {
      throw new YouTubeError(502, "Couldn't reach YouTube.")
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorResponse
      throw explain(response.status, body)
    }
    return (await response.json()) as T
  }

  /** Full records for ids from a search or playlist, in the same order (1 unit for up to 50). */
  async function withStats(ids: string[]): Promise<Video[]> {
    if (!ids.length) return []
    const data = await get<VideoListResponse>('videos', {
      part: 'snippet,contentDetails,statistics',
      id: ids.join(','),
      maxResults: String(ids.length),
    })
    const byId = new Map(data.items.map((item) => [item.id, item]))
    // Videos removed or made private since being listed simply drop out.
    return ids.flatMap((id) => {
      const item = byId.get(id)
      return item ? [toVideo(id, item.snippet, item)] : []
    })
  }

  const uploadsCache = new Map<string, string | null>()
  async function uploadsPlaylist(channelId: string): Promise<string | null> {
    if (uploadsCache.has(channelId)) return uploadsCache.get(channelId)!
    const data = await get<ChannelListResponse>('channels', {
      part: 'contentDetails',
      id: channelId,
    })
    const uploads = data.items?.[0]?.contentDetails.relatedPlaylists.uploads ?? null
    if (uploadsCache.size > 5_000) uploadsCache.clear()
    uploadsCache.set(channelId, uploads)
    return uploads
  }

  return {
    async search(query, pageToken) {
      const data = await get<SearchListResponse>('search', {
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults: String(PAGE_SIZE),
        // Only videos that can play in the embedded player.
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
        pageToken,
      })
      const ids = data.items.flatMap((item) => (item.id.videoId ? [item.id.videoId] : []))
      return { items: await withStats(ids), nextPageToken: data.nextPageToken ?? null }
    },

    async popular(pageToken) {
      const data = await get<VideoListResponse>('videos', {
        part: 'snippet,contentDetails,statistics',
        chart: 'mostPopular',
        regionCode,
        maxResults: String(PAGE_SIZE),
        pageToken,
      })
      return {
        items: data.items.map((item) => toVideo(item.id, item.snippet, item)),
        nextPageToken: data.nextPageToken ?? null,
      }
    },

    async details(id) {
      const data = await get<VideoListResponse>('videos', {
        part: 'snippet,contentDetails,statistics',
        id,
      })
      const resource = data.items[0]
      return resource ? toDetails(resource) : null
    },

    async channelVideos(channelId, pageToken) {
      // Every channel has an "uploads" playlist; reading it costs 2 units, where a
      // search by channel would cost 100.
      const uploads = await uploadsPlaylist(channelId)
      if (!uploads) throw new YouTubeError(404, 'That channel was not found.')
      const data = await get<PlaylistItemListResponse>('playlistItems', {
        part: 'snippet',
        playlistId: uploads,
        maxResults: String(PAGE_SIZE),
        pageToken,
      })
      const ids = data.items.map((item) => item.snippet.resourceId.videoId)
      return { items: await withStats(ids), nextPageToken: data.nextPageToken ?? null }
    },
  }
}
