import type { FormEvent } from 'react'

export function SearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  // Results follow typing; submitting only keeps the browser from reloading.
  const submit = (event: FormEvent) => event.preventDefault()
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </form>
  )
}
