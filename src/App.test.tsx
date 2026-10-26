import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockApi, renderApp } from './test/render'

describe('App', () => {
  it('plays the top result and lists the rest', async () => {
    mockApi()
    renderApp()
    const results = await screen.findByRole('list', { name: 'Results' })
    expect(within(results).getAllByRole('listitem')).toHaveLength(10)
    const player = screen.getByTitle(
      'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
    )
    expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ')
    expect(within(results).getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
  })

  it('plays the video you pick', async () => {
    mockApi()
    renderApp()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Sintel/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sintel')
    expect(screen.getByTitle(/^Sintel/)).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/eRsGyueVLvQ',
    )
    expect(screen.getByRole('button', { name: /Sintel/ })).toHaveAttribute('aria-current', 'true')
  })

  it('searches as you type, once you pause', async () => {
    const fetchMock = mockApi()
    renderApp()
    await screen.findByRole('list', { name: 'Results' })
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Search videos' }), 'llama')
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem'),
      ).toHaveLength(2),
    )
    // One request for the empty query, one for "llama": not one per keystroke.
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/search?q=',
      '/api/search?q=llama',
    ])
  })

  it('says when nothing matches', async () => {
    mockApi()
    renderApp()
    await screen.findByRole('list', { name: 'Results' })
    await userEvent.setup().type(screen.getByRole('searchbox'), 'zzzz')
    expect(await screen.findByText('No videos match “zzzz”.')).toBeInTheDocument()
  })

  it('says when it is showing sample videos, and labels the results', async () => {
    mockApi()
    renderApp()
    expect(await screen.findByText(/Showing sample videos/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sample videos' })).toBeInTheDocument()
    await userEvent.setup().type(screen.getByRole('searchbox'), 'sintel')
    expect(await screen.findByRole('heading', { name: 'Results for “sintel”' })).toBeInTheDocument()
  })

  it('explains errors from the server', async () => {
    mockApi({ status: 503, error: 'The daily YouTube quota is used up' })
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load videos: The daily YouTube quota is used up",
    )
  })
})
