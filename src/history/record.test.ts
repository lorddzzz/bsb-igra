// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { roomPath } from '../game/room'
import type { Pub } from '../game/types'
import { MemoryDb } from '../test/memoryBackend'
import { settle } from '../test/phones'
import { simMisija, simUljez } from '../test/sims'
import { gamesOf } from './logic'
import { HISTORY_PATH, useRecordGame } from './record'

afterEach(cleanup)

function Phone({ db, uid, code }: { db: MemoryDb; uid: string; code: string }) {
  const be = db.phone(uid)
  const pub = db.get(`${roomPath(code)}/pub`) as Pub | null
  useRecordGame(be, code, pub)
  return null
}

describe('saving finished games', () => {
  it('saves a game once even when every phone tries, and nothing while it is still going', async () => {
    const db = new MemoryDb()
    const snaps = simUljez(5, 4)
    db.commit(`${roomPath('ABCD')}/pub`, snaps.at(-2)!.pub)
    const phones = ['a', 'b', 'c', 'd'].map((uid) => render(createElement(Phone, { db, uid, code: 'ABCD' })))
    await settle()
    expect(db.get(HISTORY_PATH)).toBeNull()

    db.commit(`${roomPath('ABCD')}/pub`, snaps.at(-1)!.pub)
    phones.forEach((p, i) => p.rerender(createElement(Phone, { db, uid: 'abcd'[i], code: 'ABCD' })))
    await settle()
    const games = gamesOf(db.get(HISTORY_PATH))
    expect(games).toHaveLength(1)
    expect(games[0].room).toBe('ABCD')
    expect(games[0].at).toBe(db.clock)
    expect(games[0].players.map((p) => p.name)).toEqual(['Dusan', 'Marko', 'Luka', 'Ivan'])
  })

  it('saves Misija with each side read from the room secret', async () => {
    const db = new MemoryDb()
    const end = simMisija(9, 6, 1).at(-1)!
    db.commit(`${roomPath('MMMM')}/pub`, end.pub)
    db.commit(`${roomPath('MMMM')}/secret`, end.secret)
    render(createElement(Phone, { db, uid: 'b', code: 'MMMM' }))
    await settle()
    const [game] = gamesOf(db.get(HISTORY_PATH))
    expect(game.game).toBe('misija')
    expect(game.players.filter((p) => p.side === 'spijuni').length).toBeGreaterThan(0)
  })

  it('leaves the board alone for a phone that is only watching', async () => {
    const db = new MemoryDb()
    db.commit(`${roomPath('ABCD')}/pub`, simUljez(5, 3).at(-1)!.pub)
    render(createElement(Phone, { db, uid: 'zz', code: 'ABCD' }))
    await settle()
    expect(db.get(HISTORY_PATH)).toBeNull()
  })
})
