import { type FormEvent, useEffect, useRef } from 'react'

export function SearchBar({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  /** Enter searches straight away, without waiting for the typing pause. */
  onSubmit: () => void
}) {
  const input = useRef<HTMLInputElement>(null)

  // "/" jumps to the search box, as on YouTube, unless you're already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      input.current?.focus()
      input.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }
  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="search">
        Search videos
      </label>
      <input
        ref={input}
        id="search"
        aria-keyshortcuts="/"
        type="search"
        placeholder="Search"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </form>
  )
}
