import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '../lib/useDebouncedValue'
import { SearchBar } from './SearchBar'

/** Header with the search bar, which drives the results page's ?q=. */
export function Layout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const urlQuery = location.pathname === '/' ? ((location.search as { q?: string }).q ?? '') : null
  const [query, setQuery] = useState(urlQuery ?? '')
  // Whether the box changed by typing (rather than following the URL) since the last search.
  const typed = useRef(false)
  const settled = useDebouncedValue(query.trim())

  // Back and forward change the URL; the box follows.
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery)
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery)
    if (urlQuery !== null && urlQuery !== query.trim()) setQuery(urlQuery)
  }

  const show = (term: string) =>
    void navigate({
      to: '/',
      search: term ? { q: term } : {},
      // Refining a search replaces the history entry rather than adding one per pause.
      replace: location.pathname === '/',
    })

  // Once typing pauses, show the results.
  useEffect(() => {
    if (!typed.current) return
    typed.current = false
    show(settled)
    // Only a new settled query should navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link to="/" search={{}} className="brand" onClick={() => setQuery('')}>
          <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
            <rect width="28" height="20" rx="5" fill="#ff0033" />
            <path d="M11 6v8l7-4z" fill="#fff" />
          </svg>
          <span>Video Search</span>
        </Link>
        <SearchBar
          value={query}
          onChange={(value) => {
            typed.current = true
            setQuery(value)
          }}
          onSubmit={() => {
            typed.current = false
            show(query.trim())
          }}
        />
      </header>
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  )
}
