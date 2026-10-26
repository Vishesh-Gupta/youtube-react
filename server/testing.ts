import { vi } from 'vitest'

import channels from './fixtures/channels.json' with { type: 'json' }
import playlistItems from './fixtures/playlistItems.json' with { type: 'json' }
import popular from './fixtures/popular.json' with { type: 'json' }
import search from './fixtures/search.json' with { type: 'json' }
import videos from './fixtures/videos.json' with { type: 'json' }

const RESPONSES: Record<string, unknown> = { search, channels, playlistItems, videos }

/**
 * A stand-in for the YouTube Data API: answers each resource from recorded
 * responses (`videos` with chart=mostPopular gets the popular list), with any
 * resource overridable.
 */
export function googleApi(overrides: Record<string, () => Response> = {}) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input))
    const resource = url.pathname.split('/').at(-1)!
    if (overrides[resource]) return overrides[resource]()
    if (resource === 'videos' && url.searchParams.get('chart')) return Response.json(popular)
    return Response.json(RESPONSES[resource] ?? { items: [] })
  })
}

/** The resources requested, in order. */
export const resources = (fetchMock: ReturnType<typeof googleApi>) =>
  fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname.split('/').at(-1))
