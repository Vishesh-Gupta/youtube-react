import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { demoChannel, demoDetails, searchDemo } from '../../demo/videos'
import { createAppRouter } from '../router'

type Handler = (url: URL) => Response | Promise<Response>

/** Default answers: the sample videos, as the server gives them without a key. */
const defaults: [RegExp, Handler][] = [
  [
    /^\/api\/search$/,
    (url) =>
      Response.json({
        items: searchDemo(url.searchParams.get('q') ?? ''),
        nextPageToken: null,
        source: 'demo',
      }),
  ],
  [
    /^\/api\/videos\/([\w-]+)$/,
    (url) => {
      const video = demoDetails(url.pathname.split('/').at(-1)!)
      return video
        ? Response.json(video)
        : Response.json({ error: 'That video was not found.' }, { status: 404 })
    },
  ],
  [
    /^\/api\/channels\/([^/]+)\/videos$/,
    (url) =>
      Response.json({
        items: demoChannel(decodeURIComponent(url.pathname.split('/')[3]!)),
        nextPageToken: null,
        source: 'demo',
      }),
  ],
]

/** Stub fetch for /api, with optional overrides by path pattern (checked first). */
export function mockApi(overrides: [RegExp, Handler][] = []) {
  const routes = [...overrides, ...defaults]
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    const route = routes.find(([pattern]) => pattern.test(url.pathname))
    return route ? route[1](url) : Response.json({ error: 'Not found' }, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const fail =
  (status: number, error: string): Handler =>
  () =>
    Response.json({ error }, { status })

export function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, router }
}
