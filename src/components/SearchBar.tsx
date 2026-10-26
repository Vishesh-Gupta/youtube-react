import type { FormEvent } from 'react'

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
        id="search"
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
