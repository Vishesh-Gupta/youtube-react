import { describe, expect, it } from 'vitest'

import { formatDuration, formatViews, timeAgo } from './format'

describe('formatDuration', () => {
  it('reads ISO 8601 durations the way YouTube shows them', () => {
    expect(formatDuration('PT14M48S')).toBe('14:48')
    expect(formatDuration('PT45S')).toBe('0:45')
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03')
    expect(formatDuration('PT1H')).toBe('1:00:00')
    expect(formatDuration('P1DT2H')).toBe('26:00:00')
    expect(formatDuration('P0D')).toBeNull()
    expect(formatDuration(null)).toBeNull()
  })
})

describe('formatViews', () => {
  it('shortens big counts', () => {
    expect(formatViews(1)).toBe('1 view')
    expect(formatViews(950)).toBe('950 views')
    expect(formatViews(24_719_402)).toBe('24.7M views')
    expect(formatViews(5_100)).toBe('5.1K views')
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-10-26T12:00:00Z')
  it('says how long ago, roughly', () => {
    expect(timeAgo('2010-09-30T10:00:00Z', now)).toBe('16 years ago')
    expect(timeAgo('2026-10-25T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-10-26T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-10-26T11:59:30Z', now)).toBe('just now')
  })
})
