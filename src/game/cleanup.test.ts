// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryDb } from '../test/memoryBackend'
import { phone, room, settle } from '../test/phones'
import { cleanupOldRooms, closeRoom, createRoom, ROOM_INDEX_PATH, ROOM_MAX_AGE_MS, roomPath } from './room'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const DAY = ROOM_MAX_AGE_MS

/** A bare room as an older game left it: `online` marks who is still connected. */
function seedRoom(db: MemoryDb, code: string, at: number | null, online?: Record<string, true | number>) {
  db.commit(`${roomPath(code)}/pub`, { hostUid: 'h', phase: 'lobby', round: 0, mode: 'normal', createdAt: 1 })
  if (online) db.commit(`${roomPath(code)}/online`, online)
  if (at !== null) db.commit(`${ROOM_INDEX_PATH}/${code}`, at)
}

describe('room expiry', () => {
  it('stamps a new room in the activity index', async () => {
    const db = new MemoryDb()
    const code = await createRoom(db.phone('a'), 'kviz')
    expect(db.get(`${ROOM_INDEX_PATH}/${code}`)).toBe(db.clock)
  })

  it('removes rooms unused for 24 hours, with their index entries, and keeps the rest', async () => {
    const db = new MemoryDb()
    seedRoom(db, 'OLDA', db.clock - DAY - 1)
    seedRoom(db, 'OLDB', db.clock - 3 * DAY)
    seedRoom(db, 'FRSH', db.clock - DAY + 60_000)
    expect(await cleanupOldRooms(db.phone('x'))).toBe(2)
    expect(db.get('rooms/OLDA')).toBeNull()
    expect(db.get('rooms/OLDB')).toBeNull()
    expect(db.get(`${ROOM_INDEX_PATH}/OLDA`)).toBeNull()
    expect(db.get('rooms/FRSH/pub')).not.toBeNull()
    expect(db.get(`${ROOM_INDEX_PATH}/FRSH`)).not.toBeNull()
  })

  it('leaves an old room alone while someone is still connected to it', async () => {
    const db = new MemoryDb()
    seedRoom(db, 'LIVE', db.clock - 2 * DAY, { a: Date.now(), b: true })
    seedRoom(db, 'GONE', db.clock - 2 * DAY, { a: Date.now() })
    await cleanupOldRooms(db.phone('x'))
    expect(db.get('rooms/LIVE/pub')).not.toBeNull()
    expect(db.get('rooms/GONE')).toBeNull()
  })

  it('drops index entries whose room is already gone', async () => {
    const db = new MemoryDb()
    db.commit(`${ROOM_INDEX_PATH}/ORPH`, db.clock - 2 * DAY)
    await cleanupOldRooms(db.phone('x'))
    expect(db.get(ROOM_INDEX_PATH)).toBeNull()
  })

  it('cleans up before making a new room, and keeps the new one', async () => {
    const db = new MemoryDb()
    seedRoom(db, 'OLDA', db.clock - 2 * DAY)
    const code = await createRoom(db.phone('a'), 'uljez')
    expect(db.get('rooms/OLDA')).toBeNull()
    expect(db.get(`${roomPath(code)}/pub`)).toMatchObject({ hostUid: 'a' })
  })

  it('still makes the room when cleanup fails', async () => {
    const db = new MemoryDb()
    const be = db.phone('a')
    be.keysAtOrBelow = async () => {
      throw new Error('permission_denied')
    }
    const code = await createRoom(be, 'uljez')
    expect(db.get(`${roomPath(code)}/pub`)).toMatchObject({ hostUid: 'a' })
  })

  it('does not hand the same code to two people creating at once', async () => {
    const db = new MemoryDb()
    let calls = 0
    // The first eight draws are identical, so both phones want the same first code.
    vi.spyOn(Math, 'random').mockImplementation(() => (calls++ < 8 ? 0 : (calls % 20) / 20))
    const first = await createRoom(db.phone('a'), 'uljez')
    const second = await createRoom(db.phone('b'), 'blef')
    expect(second).not.toBe(first)
    expect(db.get(`${roomPath(first)}/pub/hostUid`)).toBe('a')
    expect(db.get(`${roomPath(second)}/pub/hostUid`)).toBe('b')
  })

  it('deletes a room when closed, and never fails if it cannot', async () => {
    const { db, code } = await room('uljez', 2)
    await closeRoom(db.phone('a'), code)
    expect(db.get(roomPath(code))).toBeNull()
    expect(db.get(`${ROOM_INDEX_PATH}/${code}`)).toBeNull()
    const broken = db.phone('a')
    broken.update = async () => {
      throw new Error('permission_denied')
    }
    await expect(closeRoom(broken, code)).resolves.toBeUndefined()
  })
})

describe('a room deleted under a connected player', () => {
  it('shows as gone, and does not come back through presence', async () => {
    const { db, code } = await room('uljez', 2)
    const b = phone(db.phone('b'), code, () => null)
    await settle()
    expect(b.view.pub).not.toBeNull()
    expect(b.view.gone).toBe(false)
    await closeRoom(db.phone('a'), code)
    await settle()
    expect(b.view.pub).toBeNull()
    expect(b.view.gone).toBe(true)
    b.unmount()
    await settle()
    expect(db.get(roomPath(code))).toBeNull()
  })

  it('is not "gone" for a code that never existed', async () => {
    const db = new MemoryDb()
    const p = phone(db.phone('b'), 'QQQQ', () => null)
    await settle()
    expect(p.view.pub).toBeNull()
    expect(p.view.gone).toBe(false)
  })

  it('keeps a room alive for 24 hours each time a player opens it', async () => {
    const { db, code } = await room('uljez', 2)
    db.clock += 5 * DAY
    const b = phone(db.phone('b'), code, () => null)
    await settle()
    expect(db.get(`${ROOM_INDEX_PATH}/${code}`)).toBe(db.clock)
    b.unmount()
  })
})

