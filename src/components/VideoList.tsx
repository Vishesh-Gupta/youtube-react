import type { Video } from '../api/types'
import { VideoListItem } from './VideoListItem'

export function VideoList({
  videos,
  selectedId,
  onSelect,
}: {
  videos: readonly Video[]
  selectedId: string | null
  onSelect: (video: Video) => void
}) {
  return (
    <ul className="video-list" aria-label="Results">
      {videos.map((video) => (
        <VideoListItem
          key={video.id}
          video={video}
          selected={video.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
