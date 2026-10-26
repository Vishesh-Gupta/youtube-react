import { Link } from '@tanstack/react-router'

import type { Video } from '../api/types'
import { formatDuration, formatViews, timeAgo } from '../lib/format'

/** A result: thumbnail with its length, title, channel, views and age. Links to the watch page. */
export function VideoCard({
  video,
  nowMs,
  compact = false,
  current = false,
}: {
  video: Video
  nowMs: number
  /** The narrow sidebar layout. */
  compact?: boolean
  current?: boolean
}) {
  const duration = formatDuration(video.duration)
  const meta = [
    video.viewCount === null ? null : formatViews(video.viewCount),
    video.publishedAt ? timeAgo(video.publishedAt, nowMs) : null,
  ].filter(Boolean)
  return (
    <li className={compact ? 'video-card is-compact' : 'video-card'}>
      <Link
        to="/watch/$videoId"
        params={{ videoId: video.id }}
        aria-current={current ? 'page' : undefined}
      >
        <span className="thumb">
          <img
            src={video.thumbnail.url}
            width={video.thumbnail.width}
            height={video.thumbnail.height}
            alt=""
            loading="lazy"
          />
          {duration ? <span className="duration">{duration}</span> : null}
        </span>
        <span className="video-card-text">
          <span className="video-card-title">{video.title}</span>
          <span className="video-card-meta">{video.channelTitle}</span>
          {meta.length ? <span className="video-card-meta">{meta.join(' · ')}</span> : null}
        </span>
      </Link>
    </li>
  )
}
