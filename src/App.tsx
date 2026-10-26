import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api } from './api/client'
import type { Video } from './api/types'
import { SearchBar } from './components/SearchBar'
import { VideoDetail } from './components/VideoDetail'
import { VideoList } from './components/VideoList'
import { useDebouncedValue } from './lib/useDebouncedValue'

export function App() {
  const [query, setQuery] = useState('')
  const term = useDebouncedValue(query.trim())
  const results = useQuery({
    queryKey: ['search', term],
    queryFn: ({ signal }) => api.search(term, signal),
    // Keep showing the last results while the next search loads.
    placeholderData: keepPreviousData,
  })
  const [chosen, setChosen] = useState<Video | null>(null)
  const videos = results.data?.items ?? []
  const source = results.data?.source
  // The chosen video stays on screen across searches; until there is one, play the top result.
  const playing = chosen ?? videos[0] ?? null

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/">
          <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
            <rect width="28" height="20" rx="5" fill="#ff0033" />
            <path d="M11 6v8l7-4z" fill="#fff" />
          </svg>
          <span>Video Search</span>
        </a>
        <SearchBar value={query} onChange={setQuery} />
      </header>
      <main className="main">
        {source === 'demo' ? (
          <p className="demo-notice">
            Showing sample videos. Set <code>YOUTUBE_API_KEY</code> on the server to search all of
            YouTube.
          </p>
        ) : null}
        {results.isError ? (
          <p className="notice" role="alert">
            Couldn&apos;t load videos: {results.error.message}
          </p>
        ) : results.isPending ? (
          <p className="notice">Loading…</p>
        ) : videos.length === 0 ? (
          <p className="notice">No videos match “{term}”.</p>
        ) : (
          <div className="layout">
            {playing ? <VideoDetail video={playing} /> : null}
            <section className="results" aria-labelledby="results-heading">
              <h2 id="results-heading" className="results-heading">
                {term
                  ? `Results for “${term}”`
                  : source === 'youtube'
                    ? 'Popular on YouTube'
                    : 'Sample videos'}
              </h2>
              <VideoList videos={videos} selectedId={playing?.id ?? null} onSelect={setChosen} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
