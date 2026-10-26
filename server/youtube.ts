// A small client for the YouTube Data API v3, flattening its resources into the
// app's Video. https://developers.google.com/youtube/v3/docs
//
// Quota: a search costs 100 units of the 10,000 a day the API allows; listing
// popular videos costs 1. The server caches both (see app.ts).

import type { SearchPage, Video } from '../src/api/types.ts'

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

interface VideoListResponse {
  nextPageToken?: string
  items: { id: string; snippet: Snippet }[]
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

function toVideo(id: string, snippet: Snippet): Video {
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
  if (reasons.has('invalidPageToken'))
    return new YouTubeError(400, 'That page of results is no longer available.')
  return new YouTubeError(502, `YouTube returned an error (${status}).`)
}

export interface YouTubeClient {
  search(query: string, pageToken?: string): Promise<Omit<SearchPage, 'source'>>
  popular(pageToken?: string): Promise<Omit<SearchPage, 'source'>>
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
      return {
        items: data.items
          .filter((item) => item.id.videoId)
          .map((item) => toVideo(item.id.videoId!, item.snippet)),
        nextPageToken: data.nextPageToken ?? null,
      }
    },

    async popular(pageToken) {
      const data = await get<VideoListResponse>('videos', {
        part: 'snippet',
        chart: 'mostPopular',
        regionCode,
        maxResults: String(PAGE_SIZE),
        pageToken,
      })
      return {
        items: data.items.map((item) => toVideo(item.id, item.snippet)),
        nextPageToken: data.nextPageToken ?? null,
      }
    },
  }
}
