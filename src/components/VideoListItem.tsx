import type { Video } from '../api/types'

export function VideoListItem({
  video,
  selected,
  onSelect,
}: {
  video: Video
  selected: boolean
  onSelect: (video: Video) => void
}) {
  return (
    <li className="video-list-item">
      <button
        type="button"
        onClick={() => onSelect(video)}
        aria-current={selected ? 'true' : undefined}
      >
        <img
          src={video.thumbnail.url}
          width={video.thumbnail.width}
          height={video.thumbnail.height}
          alt=""
          loading="lazy"
        />
        <span className="video-list-text">
          <span className="video-list-title">{video.title}</span>
          <span className="video-list-channel">{video.channelTitle}</span>
        </span>
      </button>
    </li>
  )
}
