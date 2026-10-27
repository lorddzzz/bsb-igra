// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryDb } from '../test/memoryBackend'
import { room } from '../test/phones'
import { createRoom, joinRoom, roomPath } from './room'
import { ROOM_ALPHABET } from './util'

afterEach(cleanup)

// Isolation tests: the room hooks and transactions, several phones against one fake database.

describe('creating and joining a room', () => {
  it('makes a four-letter code from the room alphabet', async () => {
    const db = new MemoryDb()
    const code = await createRoom(db.phone('a'), 'kviz')
    expect(code).toMatch(new RegExp(`^[${ROOM_ALPHABET}]{4}$`))
    expect(db.get(`${roomPath(code)}/pub`)).toMatchObject({ hostUid: 'a', game: 'kviz', phase: 'lobby', round: 0 })
  })

  it('explains why a join fails', async () => {
    const { db, code } = await room('kviz', 5)
    expect(await joinRoom(db.phone('z'), 'ZZZZ', 'Neko', 'vuk')).toBe('no-room')
    // Kviz has five badges, so the sixth friend can't get in
    expect(await joinRoom(db.phone('z'), code, 'Neko', 'sova')).toBe('full')
    // Uljez takes up to twelve, like Misija
    const big = await room('uljez', 12)
    expect(await joinRoom(big.db.phone('z'), big.code, 'Neko', 'vuk')).toBe('full')
    const two = await room('blef', 2)
    expect(await joinRoom(two.db.phone('z'), two.code, 'Neko', 'vuk')).toBe('badge-taken')
    await two.db.phone('a').set(`${roomPath(two.code)}/pub/phase`, 'write')
    expect(await joinRoom(two.db.phone('z'), two.code, 'Neko', 'medved')).toBe('started')
  })

  it('lets a player back in after the game started, keeping their place in the order', async () => {
    const { db, code } = await room('uljez', 3)
    const before = db.get(`${roomPath(code)}/pub/players/b`) as { joinedAt: number }
    await db.phone('a').set(`${roomPath(code)}/pub/phase`, 'voting')
    expect(await joinRoom(db.phone('b'), code, '  Novo ime  ', 'soko')).toBeNull()
    expect(db.get(`${roomPath(code)}/pub/players/b`)).toEqual({ name: 'Novo ime', badge: 'soko', joinedAt: before.joinedAt })
  })

  it('cuts names to 16 characters', async () => {
    const db = new MemoryDb()
    const code = await createRoom(db.phone('a'), 'uljez')
    await joinRoom(db.phone('a'), code, 'Aleksandar Veliki Makedonski', 'vuk')
    expect((db.get(`${roomPath(code)}/pub/players/a/name`) as string).length).toBe(16)
  })

  it('caps Licitacija at two and Misija at twelve', async () => {
    const lic = await room('licitacija', 2)
    expect(await joinRoom(lic.db.phone('z'), lic.code, 'Treći', 'lisica')).toBe('full')
    const m = await room('misija', 12)
    expect(await joinRoom(m.db.phone('z'), m.code, 'Trinaesti', 'vuk')).toBe('full')
  })
})
