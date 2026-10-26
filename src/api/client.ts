import type { SearchPage } from './types'

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

export const api = {
  search: (query: string, signal?: AbortSignal) =>
    request<SearchPage>(`/search?q=${encodeURIComponent(query)}`, signal),
}
