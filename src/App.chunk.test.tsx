// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?local"}
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// A phone that stayed on the home screen across a deploy asks for game files that no longer exist.
vi.mock('./gameScreens', async () => {
  const { lazy } = await import('react')
  const { ChunkLoadError } = await import('./ui/lazyScreen')
  const Gone = lazy(() => Promise.reject(new ChunkLoadError(new TypeError('Failed to fetch dynamically imported module'))))
  const gone = { Screen: Gone, Rules: Gone }
  return { GAME_SCREENS: {}, screensFor: () => gone }
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/?local')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('a game that cannot be downloaded', () => {
  it('asks the player to refresh instead of showing a blank screen, and keeps the room code', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Napravi sobu' }))
    fireEvent.change(await screen.findByPlaceholderText('npr. Marko'), { target: { value: 'Dusan' } })
    fireEvent.click(screen.getByText('Vuk'))
    fireEvent.click(screen.getByRole('button', { name: /Uđi u sobu/ }))
    expect(await screen.findByText('Igra se nije učitala')).toBeTruthy()
    expect(screen.getByText(/stigla nova verzija/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Osveži' })).toBeTruthy()
    // reloading rejoins this room
    expect(localStorage.getItem('uljez-room')).toMatch(/^[A-Z]{4}$/)
  })

  it('also covers the rules dialog', async () => {
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Pravila'))
    expect(await screen.findByText('Igra se nije učitala')).toBeTruthy()
  })
})
