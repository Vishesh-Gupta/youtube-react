import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DEMO_VIDEOS } from '../demo/videos'
import { fail, mockApi, renderApp } from './test/render'

const results = () => screen.findByRole('list', { name: 'Results' })

describe('results', () => {
  it('lists videos as links to their watch pages', async () => {
    mockApi()
    renderApp('/')
    const list = await results()
    expect(within(list).getAllByRole('listitem')).toHaveLength(DEMO_VIDEOS.length)
    expect(within(list).getByRole('link', { name: /^Sintel/ })).toHaveAttribute(
      'href',
      '/watch/eRsGyueVLvQ',
    )
    expect(screen.getByRole('heading', { name: 'Sample videos' })).toBeInTheDocument()
    expect(screen.getByText(/Showing sample videos/)).toBeInTheDocument()
  })

  it('searches as you type, keeping the query in the URL', async () => {
    const fetchMock = mockApi()
    const { router } = renderApp('/')
    await results()
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Search videos' }), 'llama')
    expect(await screen.findByRole('heading', { name: 'Results for “llama”' })).toBeInTheDocument()
    expect(within(await results()).getAllByRole('listitem')).toHaveLength(2)
    expect(router.state.location.search).toEqual({ q: 'llama' })
    // One request for the start page and one for "llama": not one per keystroke.
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/search?q=',
      '/api/search?q=llama',
    ])
  })

  it('opens straight onto a search from its URL', async () => {
    mockApi()
    renderApp('/?q=dragon')
    expect(within(await results()).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('searchbox')).toHaveValue('dragon')
  })

  it('loads more results on request', async () => {
    mockApi([
      [
        /^\/api\/search$/,
        (url) => {
          const second = url.searchParams.get('page') === 'p2'
          return Response.json({
            items: second ? DEMO_VIDEOS.slice(5) : DEMO_VIDEOS.slice(0, 5),
            nextPageToken: second ? null : 'p2',
            source: 'youtube',
          })
        },
      ],
    ])
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Popular on YouTube' })).toBeInTheDocument()
    expect(within(await results()).getAllByRole('listitem')).toHaveLength(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show more' }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem'),
      ).toHaveLength(10),
    )
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('says when nothing matches, and explains errors', async () => {
    mockApi()
    renderApp('/?q=zzzz')
    expect(await screen.findByText('No videos match “zzzz”.')).toBeInTheDocument()
  })

  it('explains server errors', async () => {
    mockApi([[/^\/api\/search$/, fail(503, "Today's YouTube search allowance is used up.")]])
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load videos: Today's YouTube search allowance is used up.",
    )
  })
})

describe('watch page', () => {
  it('plays the video with its details and more from the channel', async () => {
    mockApi()
    renderApp('/watch/WhWc3b3KhnY')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Spring - Blender Open Movie',
    )
    expect(screen.getByTitle('Spring - Blender Open Movie')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/WhWc3b3KhnY',
    )
    const more = await screen.findByRole('region', { name: 'More from Blender Studio' })
    // The other Blender Studio video, not this one.
    expect(
      within(more)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([expect.stringContaining('Agent 327')])
    await waitFor(() => expect(document.title).toBe('Spring - Blender Open Movie – Video Search'))
  })

  it('shows views, age, likes and length when YouTube gives them', async () => {
    mockApi([
      [
        /^\/api\/videos\//,
        () =>
          Response.json({
            ...DEMO_VIDEOS[1],
            publishedAt: '2010-09-30T10:00:00Z',
            viewCount: 24_719_402,
            likeCount: 251_000,
            commentCount: 17_500,
            duration: 'PT14M48S',
          }),
      ],
    ])
    renderApp('/watch/eRsGyueVLvQ')
    const stats = await screen.findByText(/24\.7M views/)
    expect(stats.closest('p')).toHaveTextContent(/24\.7M views · \d+ years ago · 251K likes/)
  })

  it('goes from a result to its watch page and back', async () => {
    mockApi()
    const { router } = renderApp('/?q=sintel')
    await userEvent.setup().click(within(await results()).getByRole('link', { name: /Sintel/ }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sintel')
    router.history.back()
    expect(await screen.findByRole('heading', { name: 'Results for “sintel”' })).toBeInTheDocument()
  })

  it('says when a video is gone', async () => {
    mockApi()
    renderApp('/watch/aaaaaaaaaaa')
    expect(
      await screen.findByRole('heading', { name: 'This video isn’t available' }),
    ).toBeInTheDocument()
  })

  it('folds long descriptions until asked', async () => {
    const long = Array.from({ length: 8 }, (_, i) => `Line ${i + 1}`).join('\n')
    mockApi([[/^\/api\/videos\//, () => Response.json({ ...DEMO_VIDEOS[0], description: long })]])
    renderApp('/watch/aqz-KE-bpKQ')
    const toggle = await screen.findByRole('button', { name: 'Show more' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.setup().click(toggle)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})

describe('unknown pages', () => {
  it('offers a way back', async () => {
    mockApi()
    renderApp('/nope')
    expect(
      await screen.findByRole('heading', { name: 'This page isn’t available' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to videos' })).toHaveAttribute('href', '/')
  })
})
