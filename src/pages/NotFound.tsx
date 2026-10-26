import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="notice">
      <h1 className="results-heading">This page isn’t available</h1>
      <p>
        <Link to="/" search={{}}>
          Back to videos
        </Link>
      </p>
    </div>
  )
}
