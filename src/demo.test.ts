import { describe, expect, it } from 'vitest'

import { DEMO_VIDEOS, searchDemo } from '../demo/videos'

describe('sample search', () => {
  it('returns everything for an empty query', () => {
    expect(searchDemo('')).toHaveLength(DEMO_VIDEOS.length)
  })

  it('needs every word, in any field, ignoring case', () => {
    expect(searchDemo('KORO llama').map((v) => v.id)).toEqual(['SkVqJ1SGeL0', 'Z4C82eyhwgU'])
    expect(searchDemo('blender studio').every((v) => v.channelTitle === 'Blender Studio')).toBe(
      true,
    )
    expect(searchDemo('dragon')).toHaveLength(1)
  })
})
