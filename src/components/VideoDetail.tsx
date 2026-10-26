import type { Video } from '../api/types'

export function VideoDetail({ video }: { video: Video }) {
  return (
    <article className="video-detail" aria-labelledby="video-title">
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
      <h1 id="video-title">{video.title}</h1>
      <p className="video-channel">{video.channelTitle}</p>
      {video.description ? <p className="video-description">{video.description}</p> : null}
    </article>
  )
}
