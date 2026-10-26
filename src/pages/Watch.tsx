import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { ApiError } from '../api/client'
import { channelQuery, videoQuery } from '../api/queries'
import type { VideoDetails } from '../api/types'
import { CardSkeletons, ErrorNotice, LoadMore } from '../components/States'
import { VideoCard } from '../components/VideoCard'
import { formatCount, formatDate, formatExact, formatViews, timeAgo } from '../lib/format'

const route = getRouteApi('/watch/$videoId')

function Player({ video }: { video: VideoDetails }) {
  return (
    <div className="player">
      {/* The privacy-enhanced embed sets no cookies until the viewer presses play. */}
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  )
}

/** Views, age and likes; then the description, collapsed to a few lines until opened. */
function About({ video, nowMs }: { video: VideoDetails; nowMs: number }) {
  const [open, setOpen] = useState(false)
  const stats = [
    video.viewCount === null ? null : (
      <span key="views" title={`${formatExact(video.viewCount)} views`}>
        {formatViews(video.viewCount)}
      </span>
    ),
    video.publishedAt ? (
      <time key="when" dateTime={video.publishedAt} title={formatDate(video.publishedAt)}>
        {timeAgo(video.publishedAt, nowMs)}
      </time>
    ) : null,
    video.likeCount === null ? null : (
      <span key="likes" title={`${formatExact(video.likeCount)} likes`}>
        {formatCount(video.likeCount)} likes
      </span>
    ),
  ].filter(Boolean)
  const long = video.description.length > 240 || video.description.split('\n').length > 3
  return (
    <div className="about">
      {stats.length ? (
        <p className="stats">
          {stats.flatMap((stat, i) => (i ? [<span key={`sep${i}`}> · </span>, stat] : [stat]))}
        </p>
      ) : null}
      {video.description ? (
        <>
          <p id="description" className={open || !long ? 'description' : 'description is-clamped'}>
            {video.description}
          </p>
          {long ? (
            <button
              type="button"
              className="text-button"
              aria-expanded={open}
              aria-controls="description"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'Show less' : 'Show more'}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function MoreFromChannel({ video, nowMs }: { video: VideoDetails; nowMs: number }) {
  const channel = useInfiniteQuery(channelQuery(video.channelId))
  const others = (channel.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((v) => v.id !== video.id)
  return (
    <section className="sidebar" aria-labelledby="more-heading">
      <h2 id="more-heading" className="sidebar-heading">
        More from {video.channelTitle}
      </h2>
      {channel.isPending ? (
        <CardSkeletons count={5} compact />
      ) : channel.isError && !others.length ? (
        <ErrorNotice error={channel.error} />
      ) : others.length === 0 ? (
        <p className="caption">Nothing else from this channel yet.</p>
      ) : (
        <>
          <ul className="video-grid is-compact">
            {others.map((v) => (
              <VideoCard key={v.id} video={v} nowMs={nowMs} compact />
            ))}
          </ul>
          {channel.hasNextPage ? (
            <LoadMore
              onClick={() => void channel.fetchNextPage()}
              loading={channel.isFetchingNextPage}
            />
          ) : null}
        </>
      )}
    </section>
  )
}

export function WatchPage() {
  const { videoId } = route.useParams()
  const video = useQuery(videoQuery(videoId))
  const [nowMs] = useState(Date.now)

  useEffect(() => {
    if (video.data) document.title = `${video.data.title} – Video Search`
  }, [video.data])

  if (video.isPending) {
    return (
      <div className="watch">
        <div className="player is-loading" aria-label="Loading video" />
      </div>
    )
  }
  if (video.isError) {
    if (video.error instanceof ApiError && video.error.status === 404) {
      return (
        <div className="notice">
          <h1 className="results-heading">This video isn’t available</h1>
          <p>
            It may have been removed or made private.{' '}
            <Link to="/" search={{}}>
              Back to videos
            </Link>
          </p>
        </div>
      )
    }
    return <ErrorNotice error={video.error} />
  }

  const data = video.data
  return (
    <div className="watch">
      <article className="primary" aria-labelledby="video-title">
        <Player video={data} />
        <h1 id="video-title" className="video-title">
          {data.title}
        </h1>
        <p className="video-channel">{data.channelTitle}</p>
        <About video={data} nowMs={nowMs} />
      </article>
      <MoreFromChannel video={data} nowMs={nowMs} />
    </div>
  )
}
