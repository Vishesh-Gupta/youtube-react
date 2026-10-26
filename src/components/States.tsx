import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>
}

export function ErrorNotice({ error }: { error: Error }) {
  return (
    <p className="notice" role="alert">
      Couldn&apos;t load videos: {error.message}
    </p>
  )
}

/** Grey placeholders in the shape of the cards that are loading. */
export function CardSkeletons({
  count = 8,
  compact = false,
}: {
  count?: number
  compact?: boolean
}) {
  return (
    <ul className={compact ? 'video-grid is-compact' : 'video-grid'} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={compact ? 'video-card is-compact skeleton' : 'video-card skeleton'}>
          <span className="thumb" />
          <span className="video-card-text">
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function LoadMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button type="button" className="load-more" onClick={onClick} disabled={loading}>
      {loading ? 'Loading…' : 'Show more'}
    </button>
  )
}
