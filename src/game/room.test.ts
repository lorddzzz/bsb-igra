// @vitest-environment jsdom
import { act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MemoryDb } from '../test/memoryBackend'
import { phone, room, settle } from '../test/phones'
import { pickerFor } from './logic'
import { createRoom, joinRoom, roomPath, useActions } from './room'
import { ROOM_ALPHABET } from './logic'
import type { Pub } from './types'

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
    const { db, code } = await room('uljez', 5)
    expect(await joinRoom(db.phone('z'), 'ZZZZ', 'Neko', 'aj')).toBe('no-room')
    // Uljez has five badges, so the sixth friend can't get in
    expect(await joinRoom(db.phone('z'), code, 'Neko', 'mic')).toBe('full')
    const two = await room('blef', 2)
    expect(await joinRoom(two.db.phone('z'), two.code, 'Neko', 'aj')).toBe('badge-taken')
    await two.db.phone('a').set(`${roomPath(two.code)}/pub/phase`, 'write')
    expect(await joinRoom(two.db.phone('z'), two.code, 'Neko', 'kevin')).toBe('started')
  })

  it('lets a player back in after the game started, keeping their place in the order', async () => {
    const { db, code } = await room('uljez', 3)
    const before = db.get(`${roomPath(code)}/pub/players/b`) as { joinedAt: number }
    await db.phone('a').set(`${roomPath(code)}/pub/phase`, 'voting')
    expect(await joinRoom(db.phone('b'), code, '  Novo ime  ', 'brian')).toBeNull()
    expect(db.get(`${roomPath(code)}/pub/players/b`)).toEqual({ name: 'Novo ime', badge: 'brian', joinedAt: before.joinedAt })
  })

  it('cuts names to 16 characters', async () => {
    const db = new MemoryDb()
    const code = await createRoom(db.phone('a'), 'uljez')
    await joinRoom(db.phone('a'), code, 'Aleksandar Veliki Makedonski', 'aj')
    expect((db.get(`${roomPath(code)}/pub/players/a/name`) as string).length).toBe(16)
  })

  it('caps Licitacija at two and Misija at twelve', async () => {
    const lic = await room('licitacija', 2)
    expect(await joinRoom(lic.db.phone('z'), lic.code, 'Treći', 'howie')).toBe('full')
    const m = await room('misija', 12)
    expect(await joinRoom(m.db.phone('z'), m.code, 'Trinaesti', 'aj')).toBe('full')
  })
})

describe('Uljez on four phones', () => {
  async function table() {
    const { db, code, uids } = await room('uljez', 4)
    const phones = uids.map((u) => phone(db.phone(u), code, useActions))
    await settle()
    return { db, code, phones, pub: () => db.get(`${roomPath(code)}/pub`) as Pub }
  }

  it('plays a round: only the picker picks, only the host opens voting, votes close on their own', async () => {
    const { phones, pub } = await table()
    const [host, ...rest] = phones
    // a double tap on start is harmless
    await act(async () => {
      await Promise.all([host.actions.startGame(), host.actions.startGame()])
    })
    await settle()
    expect(pub()).toMatchObject({ phase: 'category', round: 1 })

    const picker = phones.find((p) => p.be.uid === pickerFor(pub()))!
    const other = phones.find((p) => p !== picker)!
    await act(async () => other.actions.pickCategory('hrana'))
    expect(pub().phase).toBe('category')
    await act(async () => picker.actions.pickCategory('hrana'))
    await settle()
    expect(pub()).toMatchObject({ phase: 'clues', category: 'hrana' })
    // every phone got its ticket, and exactly one or two of them have no word
    const tickets = phones.map((p) => p.view.ticket)
    expect(tickets.every((t) => t?.category === 'hrana' && t.round === 1)).toBe(true)
    const impostors = tickets.filter((t) => t?.word === null || t?.word === undefined).length
    expect([1, 2]).toContain(impostors)
    // the round's answers stay out of reach until the vote is over
    expect(phones.every((p) => p.view.secret === null)).toBe(true)

    await act(async () => rest[0].actions.toVoting())
    expect(pub().phase).toBe('clues')
    await act(async () => host.actions.toVoting())
    await settle()
    expect(pub().phase).toBe('voting')

    // up to two suspects each; a third tap is ignored, tapping again removes one
    const [a, b, c, d] = phones
    await act(async () => {
      await a.actions.vote('b')
      await a.actions.vote('c')
    })
    await settle()
    await act(async () => a.actions.vote('d'))
    await settle()
    expect(Object.keys((pub().votes?.a as object) ?? {})).toEqual(['b', 'c'])
    await act(async () => a.actions.vote('c'))
    await settle()
    expect(Object.keys((pub().votes?.a as object) ?? {})).toEqual(['b'])
    // nobody can confirm an empty vote
    await act(async () => b.actions.lockVote())
    expect(pub().locked?.b).toBeUndefined()
    for (const [p, t] of [[a, 'b'], [b, 'a'], [c, 'a'], [d, 'a']] as const) {
      if (p !== a) await act(async () => p.actions.vote(t))
      await settle(2)
      await act(async () => p.actions.lockVote())
      await settle(2)
    }
    await settle()
    // any phone moved the room on once all four confirmed, and now everyone can read the answers
    expect(['reveal']).toContain(pub().phase)
    expect(phones.every((p) => p.view.secret?.round === 1)).toBe(true)
    // a locked vote can't change
    await act(async () => b.actions.vote('c'))
    expect(Object.keys((pub().votes?.b as object) ?? {})).toEqual(['a'])

    await act(async () => b.actions.afterReveal())
    expect(pub().phase).toBe('reveal')
    await act(async () => host.actions.afterReveal())
    await settle()
    expect(['guess', 'score', 'over']).toContain(pub().phase)
  })

  it('survives a phone answering a transaction from an empty cache', async () => {
    const { db, phones, pub } = await table()
    db.coldTransactions = true
    await act(async () => phones[0].actions.startGame())
    await settle()
    expect(pub().phase).toBe('category')
  })
})
