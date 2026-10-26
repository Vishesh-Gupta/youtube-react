// Display helpers for the numbers and times the API returns.

/** "PT1H2M3S" → "1:02:03", "PT4M5S" → "4:05". Null for anything else (e.g. live streams' "P0D"). */
export function formatDuration(iso: string | null): string | null {
  const match = iso?.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  const [, days = '0', h = '0', m = '0', s = '0'] = match
  const hours = Number(days) * 24 + Number(h)
  const pad = (n: string | number) => String(n).padStart(2, '0')
  return hours ? `${hours}:${pad(m)}:${pad(s)}` : `${Number(m)}:${pad(s)}`
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en')

/** "24M views", "1 view". */
export function formatViews(count: number): string {
  return `${count < 1000 ? full.format(count) : compact.format(count)} ${count === 1 ? 'view' : 'views'}`
}

export const formatCount = (count: number) => compact.format(count)
export const formatExact = (count: number) => full.format(count)

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 years ago", "yesterday", "just now". */
export function timeAgo(iso: string, nowMs: number): string {
  const seconds = (Date.parse(iso) - nowMs) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
