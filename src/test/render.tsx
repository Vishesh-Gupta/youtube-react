import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { App } from '../App'
import { searchDemo } from '../../demo/videos'

/** Answer /api/search from the sample videos, or with `failure` if given. */
export function mockApi(failure?: { status: number; error: string }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (failure) return Response.json({ error: failure.error }, { status: failure.status })
    return Response.json({
      items: searchDemo(url.searchParams.get('q') ?? ''),
      nextPageToken: null,
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}
