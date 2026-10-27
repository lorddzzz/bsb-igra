import { describe, expect, it } from 'vitest'
import type { Pub } from '../game/types'
import {
  handOf,
  HAND,
  matchWinner,
  nextLic,
  nextSet,
  placeBid,
  potOf,
  ROUNDS,
  startLic,
  takerOf,
  TICKETS,
  upcoming,
} from './logic'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const players = {
  a: { name: 'Ana', badge: 'aj', joinedAt: 1 },
  b: { name: 'Bojan', badge: 'brian', joinedAt: 2 },
}

function lobby(): Pub {
  return { hostUid: 'a', game: 'licitacija', createdAt: 0, mode: 'normal', phase: 'lobby', round: 0, players }
}

/** A started game with a known deck. */
function withDeck(deck: number[]): Pub {
  const p = startLic(lobby(), seeded(1))
  return { ...p, lic: { ...p.lic, deck } }
}

function play(p: Pub, a: number, b: number): Pub {
  const afterA = placeBid(p, 'a', a)
  expect(afterA).toBeDefined()
  const afterB = placeBid(afterA!, 'b', b)
  expect(afterB).toBeDefined()
  return afterB!
}

describe('licitacija', () => {
  it('starts with a full shuffled deck, full hands and zero scores', () => {
    const p = startLic(lobby(), seeded(7))
    expect(p.phase).toBe('bid')
    expect(p.round).toBe(1)
    expect([...p.lic!.deck!].sort((x, y) => x - y)).toEqual([...TICKETS].sort((x, y) => x - y))
    expect(handOf(p, 'a')).toEqual(HAND)
    expect(p.scores).toEqual({ a: 0, b: 0 })
    expect(p.lic!.wins).toEqual({ a: 0, b: 0 })
  })

  it('takerOf: higher bid takes a prize, lower bid takes a penalty, ties take nothing', () => {
    expect(takerOf({ a: 5, b: 9 }, 7)).toBe('b')
    expect(takerOf({ a: 5, b: 9 }, -2)).toBe('a')
    expect(takerOf({ a: 4, b: 4 }, 7)).toBeUndefined()
  })

  it('reveals only once both have bid, and the higher bid takes the ticket', () => {
    const p = withDeck([7, ...TICKETS.filter((t) => t !== 7)])
    const one = placeBid(p, 'a', 5)!
    expect(one.phase).toBe('bid')
    const two = placeBid(one, 'b', 9)!
    expect(two.phase).toBe('duel')
    expect(two.scores).toEqual({ a: 0, b: 7 })
    expect(two.lic!.duel).toMatchObject({ round: 1, pot: [7], taker: 'b', bids: { a: 5, b: 9 } })
    expect(handOf(two, 'a')).not.toContain(5)
    expect(handOf(two, 'b')).not.toContain(9)
    expect(two.lic!.bids).toBeUndefined()
  })

  it('refuses a second bid, a used card and bids outside the bidding phase', () => {
    const p = withDeck([...TICKETS])
    const one = placeBid(p, 'a', 5)!
    expect(placeBid(one, 'a', 6)).toBeUndefined()
    const next = nextLic(play(p, 5, 6))
    expect(placeBid(next, 'a', 5)).toBeUndefined()
    expect(placeBid(play(p, 1, 2), 'a', 3)).toBeUndefined()
    expect(placeBid(p, 'x', 3)).toBeUndefined()
  })

  it('the lower bid takes a penalty ticket', () => {
    const p = withDeck([-3, ...TICKETS.filter((t) => t !== -3)])
    const r = play(p, 2, 10)
    expect(r.scores).toEqual({ a: -3, b: 0 })
  })

  it('a tie leaves the pot on the table for the next round', () => {
    const p = withDeck([5, 8, ...TICKETS.filter((t) => t !== 5 && t !== 8)])
    const tie = play(p, 6, 6)
    expect(tie.lic!.duel!.taker).toBeUndefined()
    expect(tie.scores).toEqual({ a: 0, b: 0 })
    const r2 = nextLic(tie)
    expect(potOf(r2)).toEqual([5, 8])
    const won = play(r2, 3, 1)
    expect(won.scores).toEqual({ a: 13, b: 0 })
    expect(potOf(nextLic(won))).toHaveLength(1)
  })

  it('a carried pot that sums to a penalty goes to the lower bid', () => {
    const p = withDeck([-3, 1, ...TICKETS.filter((t) => t !== -3 && t !== 1)])
    const r2 = nextLic(play(p, 4, 4))
    const r = play(r2, 2, 7)
    expect(r.scores).toEqual({ a: -2, b: 0 })
  })

  it('a game of only ties is a draw that does not count', () => {
    let p = startLic(lobby(), seeded(3))
    for (let i = 1; i <= ROUNDS; i++) p = nextLic(play(p, i, i))
    expect(p.phase).toBe('set')
    expect(p.lic!.setWinner).toBeUndefined()
    expect(p.lic!.wins).toEqual({ a: 0, b: 0 })
    p = nextSet(p, seeded(4))
    expect(p.lic!.set).toBe(1)
    expect(p.lic!.carry).toBeUndefined()
    expect(upcoming(p)).toHaveLength(ROUNDS - 1)
  })

  it('counts game wins and ends the match at two', () => {
    let p = startLic(lobby(), seeded(5))
    // b always bids one card higher than a (and 1 against a's 13 at the end), so nobody ties
    for (let i = 1; i <= ROUNDS; i++) p = nextLic(play(p, i, (i % ROUNDS) + 1))
    const { a, b } = p.scores as Record<string, number>
    expect(a + b).toBe(TICKETS.reduce((x, y) => x + y, 0))
    const first = a > b ? 'a' : 'b'
    expect(p.phase).toBe('set')
    expect(p.lic!.setWinner).toBe(first)
    expect(p.lic!.wins![first]).toBe(1)
    p = nextSet(p, seeded(6))
    expect(p.lic!.set).toBe(2)
    expect(p.scores).toEqual({ a: 0, b: 0 })
    expect(handOf(p, 'a')).toEqual(HAND)
    p = nextLic({ ...p, phase: 'duel', round: ROUNDS, scores: { a: 0, b: 0, [first]: 4 } })
    expect(p.phase).toBe('over')
    expect(matchWinner(p)).toBe(first)
  })
})
