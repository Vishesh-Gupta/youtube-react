import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'

import { ApiError, api } from './client'
import type { SearchPage } from './types'

const nextPage = (last: SearchPage) => last.nextPageToken

export const searchQuery = (term: string) =>
  infiniteQueryOptions({
    queryKey: ['search', term],
    queryFn: ({ pageParam, signal }) => api.search(term, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: nextPage,
  })

export const videoQuery = (id: string) =>
  queryOptions({
    queryKey: ['video', id],
    queryFn: ({ signal }) => api.video(id, signal),
    // A missing video stays missing; don't retry it.
    retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 1,
  })

export const channelQuery = (channelId: string) =>
  infiniteQueryOptions({
    queryKey: ['channel', channelId],
    queryFn: ({ pageParam, signal }) => api.channelVideos(channelId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: nextPage,
  })
