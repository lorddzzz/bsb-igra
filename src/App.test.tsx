// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?local"}
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

// The whole app in one tab on the local test backend: home screen, making a room, check-in, lobby.
// The page address must say ?local before the app loads, or it would talk to the real Firebase.
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/?local')
})
afterEach(cleanup)

describe('app', () => {
  it('offers all six games and remembers the one picked', async () => {
    render(<App />)
    // proof this runs on the local backend, never the real database
    expect(await screen.findByText('Probni režim (bez interneta)')).toBeTruthy()
    const games = await screen.findAllByRole('radio')
    expect(games.map((g) => g.querySelector('b')?.textContent)).toEqual(['ULJEZ', 'BLEF', 'TALAS', 'KVIZ', 'LICITACIJA', 'MISIJA'])
    fireEvent.click(screen.getByRole('radio', { name: /KVIZ/ }))
    expect(localStorage.getItem('druzina-game')).toBe('kviz')
    expect(screen.getByRole('radio', { name: /KVIZ/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('makes a room, checks in and lands in the lobby, then leaves', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('radio', { name: /MISIJA/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Napravi sobu' }))
    const name = await screen.findByPlaceholderText('npr. Marko')
    // Misija has twelve badges to pick from
    expect(document.querySelectorAll('.badge-pick')).toHaveLength(12)
    const enter = screen.getByRole('button', { name: /Uđi u sobu/ }) as HTMLButtonElement
    expect(enter.disabled).toBe(true)
    fireEvent.change(name, { target: { value: 'Dusan' } })
    fireEvent.click(screen.getByText('Zmaj'))
    expect(enter.disabled).toBe(false)
    fireEvent.click(enter)
    expect(await screen.findByText(/Družina \(1\)/)).toBeTruthy()
    // the start button counts down the players still missing
    expect(screen.getByRole('button', { name: /Treba još 4 igrača/ })).toBeTruthy()
    const code = localStorage.getItem('uljez-room')
    expect(code).toMatch(/^[A-Z]{4}$/)
    fireEvent.click(screen.getByRole('button', { name: 'Izađi iz sobe' }))
    expect(await screen.findByRole('button', { name: 'Napravi sobu' })).toBeTruthy()
    expect(localStorage.getItem('uljez-room')).toBeNull()
  })

  it('says so when a typed room code does not exist', async () => {
    render(<App />)
    const input = await screen.findByPlaceholderText('ABCD')
    fireEvent.change(input, { target: { value: 'z-z9zzz' } })
    expect((input as HTMLInputElement).value).toBe('ZZZZ')
    fireEvent.change(input, { target: { value: 'qqqq' } })
    fireEvent.click(screen.getByRole('button', { name: 'Uđi' }))
    expect(await screen.findByText('Soba QQQQ ne postoji.')).toBeTruthy()
  })
})
