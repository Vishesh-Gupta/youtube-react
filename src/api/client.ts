import type { SearchPage, VideoDetails } from './types'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

const withPage = (path: string, page?: string | null) =>
  page ? `${path}${path.includes('?') ? '&' : '?'}page=${encodeURIComponent(page)}` : path

export const api = {
  search: (query: string, page?: string | null, signal?: AbortSignal) =>
    request<SearchPage>(withPage(`/search?q=${encodeURIComponent(query)}`, page), signal),
  video: (id: string, signal?: AbortSignal) =>
    request<VideoDetails>(`/videos/${encodeURIComponent(id)}`, signal),
  channelVideos: (channelId: string, page?: string | null, signal?: AbortSignal) =>
    request<SearchPage>(
      withPage(`/channels/${encodeURIComponent(channelId)}/videos`, page),
      signal,
    ),
}
