// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { room } from '../test/phones'
import { MemoryDb } from '../test/memoryBackend'
import { HOST_GRACE_MS, hostOffline, takeOverHost } from './recovery'
import { joinRoom, roomPath } from './room'

afterEach(cleanup)

describe('shared room recovery', () => {
  it('requires a confirmed offline timestamp and a reconnect grace period', () => {
    expect(hostOffline({}, 'a', 50_000)).toBe(false)
    expect(hostOffline({ a: true }, 'a', 50_000)).toBe(false)
    expect(hostOffline({ a: 50_000 - HOST_GRACE_MS + 1 }, 'a', 50_000)).toBe(false)
    expect(hostOffline({ a: 50_000 - HOST_GRACE_MS }, 'a', 50_000)).toBe(true)
  })
  it('elects one candidate without changing the round, players, scores or secret data', async () => {
    const { db, code } = await room('uljez', 3)
    const base = roomPath(code)
    await db.phone('a').update(`${base}/pub`, { phase: 'clues', scores: { a: 2, b: 1 }, round: 3 })
    await db.phone('a').set(`${base}/secret`, { word: 'tajna' })
    await db.phone('a').set(`${base}/online`, { a: db.clock - HOST_GRACE_MS, b: true, c: true })
    const before = db.get(`${base}/pub`) as object
    expect(await Promise.all(['b', 'c'].map((uid) => takeOverHost(db.phone(uid), code, 'a')))).toEqual([true, false])
    expect(db.get(`${base}/pub`)).toEqual({ ...before, hostUid: 'b' })
    expect(db.get(`${base}/secret`)).toEqual({ word: 'tajna' })
  })
  it('refuses online/reconnecting hosts, outsiders and offline candidates', async () => {
    const { db, code } = await room('talas', 3)
    const online = `${roomPath(code)}/online`
    for (const a of [true, db.clock - 1000] as const) {
      await db.phone('a').set(online, { a, b: true })
      expect(await takeOverHost(db.phone('b'), code, 'a')).toBe(false)
    }
    await db.phone('a').set(online, { a: db.clock - HOST_GRACE_MS, z: true })
    expect(await takeOverHost(db.phone('z'), code, 'a')).toBe(false)
    expect(await takeOverHost(db.phone('b'), code, 'a')).toBe(false)
  })
  it('blocks joins and takeover for unknown games or incompatible protocols without writes', async () => {
    const db = new MemoryDb()
    const base = 'rooms/ABCD'
    for (const patch of [{ game: 'future' }, { game: 'uljez', protocol: 2 }]) {
      db.commit(`${base}/pub`, { hostUid: 'a', phase: 'lobby', players: { b: { name: 'B' } }, ...patch })
      db.commit(`${base}/online`, { a: db.clock - HOST_GRACE_MS, b: true })
      const writes = db.writes
      expect(await joinRoom(db.phone('b'), 'ABCD', 'B', 'vuk')).toBe('incompatible')
      expect(await takeOverHost(db.phone('b'), 'ABCD', 'a')).toBe(false)
      expect(db.writes).toBe(writes)
    }
  })
})
