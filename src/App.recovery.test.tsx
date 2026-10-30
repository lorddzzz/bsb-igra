// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?local"}
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Backend } from './backend/types'
import { MemoryDb } from './test/memoryBackend'
import { createRoom, joinRoom, roomPath } from './game/room'
import { HOST_GRACE_MS } from './game/recovery'
import App from './App'

const mock = vi.hoisted(() => ({ be: null as Backend | null, sounds: vi.fn(), record: vi.fn(), game: vi.fn() }))
vi.mock('./backend', () => ({ connect: async () => mock.be!, isLocalBackend: () => true }))
vi.mock('./ui/stageSounds', () => ({ useStageSounds: mock.sounds }))
vi.mock('./history/record', () => ({ useRecordGame: mock.record }))
vi.mock('./gameScreens', () => ({ screensFor: () => ({ Screen: () => { mock.game(); return <p>Igra spremna</p> } }) }))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/?local')
  vi.clearAllMocks()
})
afterEach(cleanup)

async function setup(member = true) {
  const db = new MemoryDb()
  const code = await createRoom(db.phone('a'), 'uljez')
  await joinRoom(db.phone('a'), code, 'Ana', 'vuk')
  if (member) await joinRoom(db.phone('b'), code, 'Bob', 'soko')
  mock.be = db.phone('b')
  localStorage.setItem('uljez-room', code)
  return { db, code, path: roomPath(code) }
}

it.each([{ game: 'buduca-igra' }, { game: 'uljez', protocol: 2 }])('blocks incompatible rooms before any game hooks or joining: %j', async (patch) => {
  const { db, path, code } = await setup(false)
  await db.phone('a').update(`${path}/pub`, patch)
  render(<App />)
  expect(await screen.findByText('Ovoj sobi treba druga verzija')).toBeTruthy()
  expect(screen.queryByPlaceholderText('npr. Marko')).toBeNull()
  expect(mock.game).not.toHaveBeenCalled()
  expect(mock.sounds).not.toHaveBeenCalled()
  expect(mock.record).not.toHaveBeenCalled()
  expect(localStorage.getItem('uljez-room')).toBe(code)
  fireEvent.click(screen.getByRole('button', { name: 'Nazad' }))
  expect(await screen.findByRole('button', { name: 'Napravi sobu' })).toBeTruthy()
})

it('reconnects to the same game and player after transport is restored', async () => {
  const { path, db } = await setup()
  let signal: (value: boolean) => void = () => {}
  const stop = vi.fn()
  mock.be = { ...mock.be!, connection: (cb) => { signal = cb; cb(true); return stop } }
  const r = render(<App />)
  expect(await screen.findByText('Igra spremna')).toBeTruthy()
  await act(async () => signal(false))
  expect(screen.getByText('Veza je prekinuta')).toBeTruthy()
  expect(screen.queryByText('Igra spremna')).toBeNull()
  await act(async () => signal(true))
  expect(await screen.findByText('Igra spremna')).toBeTruthy()
  expect(db.get(`${path}/pub/players/b/name`)).toBe('Bob')
  r.unmount()
  expect(stop).toHaveBeenCalledOnce()
})

it('retries a failed subscription without reporting the room as deleted', async () => {
  await setup()
  const be = mock.be!
  let fail = true
  mock.be = { ...be, listen: (path, cb, onError) => {
    if (fail && path.endsWith('/pub')) { onError?.(new Error('denied')); return () => {} }
    return be.listen(path, cb, onError)
  } }
  render(<App />)
  expect(await screen.findByText('Soba se nije učitala')).toBeTruthy()
  expect(screen.queryByText(/ne postoji/)).toBeNull()
  fail = false
  fireEvent.click(screen.getByRole('button', { name: 'Probaj ponovo' }))
  expect(await screen.findByText('Igra spremna')).toBeTruthy()
})

it('offers explicit host recovery, preserves the absent player and does not transfer automatically', async () => {
  const { db, path } = await setup()
  await db.phone('a').set(`${path}/online/a`, db.clock - HOST_GRACE_MS)
  render(<App />)
  expect(await screen.findByText('Čekamo pojačanje')).toBeTruthy()
  expect(db.get(`${path}/pub/hostUid`)).toBe('a')
  fireEvent.click(screen.getByRole('button', { name: 'Preuzmi ulogu domaćina' }))
  expect(await screen.findByText('Ti si sada domaćin.')).toBeTruthy()
  expect(db.get(`${path}/pub/hostUid`)).toBe('b')
  expect(db.get(`${path}/pub/players/a/name`)).toBe('Ana')
})
