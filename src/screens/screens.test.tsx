// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { normalizeSecret, playerOrder } from '../game/logic'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { MemoryDb } from '../test/memoryBackend'
import { simBlef, simKviz, simLic, simMisija, simUljez, simWave, type Snapshot } from '../test/sims'
import { Blef } from './Blef'
import { Game } from './Game'
import { Kviz } from './Kviz'
import { Lic } from './Lic'
import { Misija } from './Misija'
import { Wave } from './Wave'

// Every state a simulated game passes through, rendered on every phone, with data shaped exactly
// like Firebase returns it. This is the guard against the "black screen": a screen that crashes on
// a list Firebase dropped, a missing ticket, or a state nobody tapped through by hand.

const SECRET_PHASES = ['reveal', 'guess', 'missions', 'score', 'over']
const errors: string[] = []
const realError = console.error

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' ').slice(0, 300))
  }
})
afterAll(() => {
  console.error = realError
})
afterEach(() => {
  cleanup()
})

type Screen = typeof Game

function viewFor(s: Snapshot, uid: string): RoomView {
  return {
    pub: s.pub,
    ticket: (s.tickets[uid] as RoomView['ticket']) ?? null,
    secret: SECRET_PHASES.includes(s.pub.phase) ? normalizeSecret(s.secret) : null,
    online: {},
    loading: false,
  }
}

function renderAll(Screen: Screen, snaps: Snapshot[], label: string) {
  let renders = 0
  for (const s of snaps) {
    const db = new MemoryDb()
    db.clock = s.now
    db.tree = { rooms: { TEST: { pub: s.pub, tickets: s.tickets, secret: s.secret } } } as never
    vi.setSystemTime(s.now)
    for (const uid of playerOrder(s.pub as Pub)) {
      try {
        const { container, unmount } = render(<Screen be={db.phone(uid)} code="TEST" view={viewFor(s, uid)} />)
        // something is on the screen: not an empty (black) page
        expect(container.textContent?.trim().length, `${label} ${s.label} as ${uid}`).toBeGreaterThan(0)
        unmount()
        renders++
      } catch (e) {
        throw new Error(`${label}: ${s.label} as ${uid}: ${(e as Error).message}`)
      }
    }
  }
  expect(errors, `React reported errors in ${label}`).toEqual([])
  return renders
}

/** Every distinct phase/label combination once, so the run stays fast. */
function distinct(snaps: Snapshot[]): Snapshot[] {
  const seen = new Set<string>()
  return snaps.filter((s) => {
    const key = `${s.pub.phase}|${s.label.replace(/[a-l] /g, '').replace(/\d+/g, '')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

describe('every screen renders in every state, on every phone', () => {
  it('Uljez', () => {
    for (const [seed, n] of [[1, 3], [2, 4], [3, 5], [7, 4]]) renderAll(Game, distinct(simUljez(seed, n)), `Uljez ${n}p`)
  })
  it('Blef', () => {
    for (const [seed, n] of [[1, 3], [5, 5]]) renderAll(Blef, distinct(simBlef(seed, n)), `Blef ${n}p`)
  })
  it('Talas', () => {
    for (const [seed, n] of [[1, 3], [4, 5]]) renderAll(Wave, distinct(simWave(seed, n)), `Talas ${n}p`)
  })
  it('Kviz', () => {
    for (const [seed, n] of [[1, 3], [9, 5]]) renderAll(Kviz, simKviz(seed, n).filter((_, i) => i % 3 === 0), `Kviz ${n}p`)
  })
  it('Licitacija', () => {
    renderAll(Lic, simLic(3).filter((_, i) => i % 4 === 0 || true), 'Licitacija')
  })
  it('Misija', () => {
    for (const [seed, n, sp] of [[1, 5, 0], [2, 8, 5], [3, 12, 3], [4, 7, 1]])
      renderAll(Misija, distinct(simMisija(seed, n, sp)), `Misija ${n}p ${sp} roles`)
  })
})

describe('reveal drum rolls', () => {
  // A screen that mounts with its data already loaded runs its effects twice under StrictMode (and
  // again on any re-run); the reveal must still come after the drum roll, not hang on it.
  it('Uljez shows the impostor after the drum roll even when the answers were already loaded', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const s = simUljez(2, 4).find((x) => x.pub.phase === 'reveal')!
    const db = new MemoryDb()
    const { container } = render(
      <StrictMode>
        <Game be={db.phone('b')} code="TEST" view={viewFor(s, 'b')} />
      </StrictMode>,
    )
    expect(container.querySelector('.drumroll')).not.toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(2500)
    })
    expect(container.querySelector('.reveal-card')).not.toBeNull()
    vi.useRealTimers()
  })
})
