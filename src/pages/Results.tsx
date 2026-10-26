import { useInfiniteQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { searchQuery } from '../api/queries'
import { VideoCard } from '../components/VideoCard'
import { CardSkeletons, ErrorNotice, LoadMore, Notice } from '../components/States'

const route = getRouteApi('/')

export function ResultsPage() {
  const { q = '' } = route.useSearch()
  const results = useInfiniteQuery(searchQuery(q))
  const [nowMs] = useState(Date.now)
  const pages = results.data?.pages ?? []
  const videos = pages.flatMap((page) => page.items)
  const source = pages[0]?.source

  useEffect(() => {
    document.title = q ? `${q} – Video Search` : 'Video Search'
  }, [q])

  const heading = q
    ? `Results for “${q}”`
    : source === 'youtube'
      ? 'Popular on YouTube'
      : 'Sample videos'

  return (
    <>
      {source === 'demo' ? (
        <p className="demo-notice">
          Showing sample videos. Set <code>YOUTUBE_API_KEY</code> on the server to search all of
          YouTube.
        </p>
      ) : null}
      <section aria-labelledby="results-heading">
        <h1 id="results-heading" className="results-heading">
          {heading}
        </h1>
        {results.isPending ? (
          <CardSkeletons />
        ) : results.isError && !videos.length ? (
          <ErrorNotice error={results.error} />
        ) : videos.length === 0 ? (
          <Notice>No videos match “{q}”.</Notice>
        ) : (
          <>
            <ul className="video-grid" aria-label="Results">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} nowMs={nowMs} />
              ))}
            </ul>
            {results.isFetchNextPageError ? <ErrorNotice error={results.error} /> : null}
            {results.hasNextPage ? (
              <LoadMore
                onClick={() => void results.fetchNextPage()}
                loading={results.isFetchingNextPage}
              />
            ) : null}
          </>
        )}
      </section>
    </>
  )
}
