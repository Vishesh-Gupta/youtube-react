import type { QueryClient } from '@tanstack/react-query'
import {
  type RouterHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

import { Layout } from './components/Layout'
import { NotFound } from './pages/NotFound'
import { ResultsPage } from './pages/Results'
import { WatchPage } from './pages/Watch'

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Layout,
  notFoundComponent: NotFound,
})

export const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' && search.q.trim() ? search.q.slice(0, 200) : undefined,
  }),
  component: ResultsPage,
})

export const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'watch/$videoId',
  component: WatchPage,
})

const routeTree = rootRoute.addChildren([resultsRoute, watchRoute])

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({ routeTree, history, context: { queryClient }, scrollRestoration: true })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
