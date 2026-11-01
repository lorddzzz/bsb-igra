import { describe, expect, it } from 'vitest'
import { PRVI_PROMPTS } from '../data/prviPrompts'
import type { Pub } from '../game/types'
import { seededRng } from '../uljez/logic'
import { firebaseShape } from '../test/firebaseShape'
import { lobby } from '../test/sims'
import {
  allVoted,
  applyPrvi,
  countVotes,
  currentPrompt,
  drawPrompts,
  isFinalRound,
  nextPrviRound,
  prviOf,
  resetPrviLobby,
  ROUNDS,
  scorePrvi,
  startPrvi,
  titlesOf,
  validVote,
  votersFor,
} from './logic'

/** A round in the voting phase with n players a, b, c... and these votes. */
const voting = (n: number, votes: Record<string, string> = {}): Pub => {
  const p = lobby('prvi', n)
  const order = Object.keys(p.players ?? {})
  const prompts = PRVI_PROMPTS.filter((x) => x.level === 'lagano')
    .slice(0, ROUNDS)
    .map((x) => x.id)
  return { ...p, phase: 'vote', round: 1, scores: Object.fromEntries(order.map((u) => [u, 0])), prvi: { level: 'lagano', prompts, votes } }
}

describe('voting', () => {
  it('accepts a vote for any player in the room, yourself included', () => {
    const p = voting(3)
    expect(validVote(p, 'a', 'a')).toBe(true)
    expect(validVote(p, 'a', 'c')).toBe(true)
    expect(validVote(p, 'a', 'z')).toBe(false)
    expect(validVote(p, 'z', 'a')).toBe(false)
    expect(validVote(p, 'a', 7)).toBe(false)
  })

  it('waits for every player, and ignores votes for someone who is not in the room', () => {
    expect(allVoted(voting(3, { a: 'b', b: 'b' }))).toBe(false)
    expect(allVoted(voting(3, { a: 'b', b: 'b', c: 'z' }))).toBe(false)
    expect(allVoted(voting(3, { a: 'b', b: 'b', c: 'c' }))).toBe(true)
    expect(countVotes(voting(3, { a: 'b', b: 'b', c: 'z' }))).toEqual({ b: 2 })
  })

  it('lists who voted for whom in join order', () => {
    const p = voting(4, { d: 'a', b: 'a', a: 'c', c: 'a' })
    expect(votersFor(p, 'a')).toEqual(['b', 'c', 'd'])
    expect(votersFor(p, 'b')).toEqual([])
  })
})

describe('scoring', () => {
  it('gives +1 to the majority voters and the title to the most-voted player, who gets no points for it', () => {
    // 5 players: 3 for b, 2 for a
    const p = voting(5, { a: 'b', b: 'a', c: 'b', d: 'b', e: 'a' })
    const r = scorePrvi(p)
    expect(r.top).toEqual(['b'])
    expect(r.counts).toEqual({ a: 2, b: 3 })
    expect(Object.fromEntries(Object.entries(r.gains).map(([u, g]) => [u, g.points]))).toEqual({ a: 1, b: 0, c: 1, d: 1, e: 0 })
  })

  it('shares the title in a tie and pays voters of every tied leader', () => {
    // 2-2-1: a and b tied
    const p = voting(5, { a: 'b', b: 'a', c: 'a', d: 'b', e: 'c' })
    const r = scorePrvi(p)
    expect(r.top).toEqual(['a', 'b'])
    expect(Object.fromEntries(Object.entries(r.gains).map(([u, g]) => [u, g.points]))).toEqual({ a: 1, b: 1, c: 1, d: 1, e: 0 })
  })

  it('counts a self-vote like any other', () => {
    const r = scorePrvi(voting(3, { a: 'a', b: 'a', c: 'b' }))
    expect(r.top).toEqual(['a'])
    expect(r.gains.a.points).toBe(1)
    expect(r.gains.b.points).toBe(1)
    expect(r.gains.c.points).toBe(0)
  })

  it('pays nobody and gives no title when every vote went to a different player', () => {
    for (const p of [voting(3, { a: 'b', b: 'c', c: 'a' }), voting(4, { a: 'a', b: 'b', c: 'c', d: 'd' })]) {
      const r = scorePrvi(p)
      expect(r.top).toEqual([])
      expect(Object.values(r.gains).every((g) => g.points === 0)).toBe(true)
    }
  })

  it('pays everyone when the whole room agrees', () => {
    const r = scorePrvi(voting(4, { a: 'c', b: 'c', c: 'c', d: 'c' }))
    expect(r.top).toEqual(['c'])
    expect(Object.values(r.gains).map((g) => g.points)).toEqual([1, 1, 1, 1])
  })

  it('adds points, stats and titles, and survives a Firebase round trip', () => {
    const p = voting(3, { a: 'b', b: 'b', c: 'a' })
    const after = firebaseShape(applyPrvi(p, scorePrvi(p)))
    expect(after.phase).toBe('result')
    expect(after.scores).toEqual({ a: 1, b: 1, c: 0 })
    expect(after.stats?.b).toEqual({ majority: 1, titles: 1 })
    expect(titlesOf(after, 'b').map((t) => t.id)).toEqual([currentPrompt(p).id])
    expect(titlesOf(after, 'a')).toEqual([])
  })
})

describe('a game', () => {
  it('draws 10 prompts of the chosen level, fresh ones first', () => {
    const lagano = PRVI_PROMPTS.filter((p) => p.level === 'lagano').map((p) => p.id)
    const seen = lagano.slice(0, 25)
    const drawn = drawPrompts('lagano', seen, ROUNDS, seededRng(1))
    expect(drawn).toHaveLength(ROUNDS)
    expect(new Set(drawn).size).toBe(ROUNDS)
    // the 5 unseen ones come first
    expect(new Set(drawn.slice(0, 5))).toEqual(new Set(lagano.slice(25)))
    expect(drawn.every((id) => lagano.includes(id))).toBe(true)
  })

  it('starts, keeps titles between rounds, ends after prompt 10 and returns to a lobby that keeps the level', () => {
    let p: Pub = { ...lobby('prvi', 3), prvi: { level: 'ljuto' } }
    p = firebaseShape(startPrvi(p, seededRng(2)))
    expect(p).toMatchObject({ phase: 'vote', round: 1, scores: { a: 0, b: 0, c: 0 } })
    expect(prviOf(p).prompts).toHaveLength(ROUNDS)
    expect(currentPrompt(p).level).toBe('ljuto')
    for (let round = 1; round <= ROUNDS; round++) {
      p = firebaseShape({ ...p, prvi: { ...prviOf(p), votes: { a: 'c', b: 'c', c: 'a' } } })
      p = firebaseShape(applyPrvi(p, scorePrvi(p)))
      expect(isFinalRound(p)).toBe(round === ROUNDS)
      p = firebaseShape(nextPrviRound(p))
      if (round < ROUNDS) expect(prviOf(p).votes).toBeUndefined()
    }
    expect(p.phase).toBe('over')
    expect(p.scores).toEqual({ a: ROUNDS, b: ROUNDS, c: 0 })
    expect(titlesOf(p, 'c')).toHaveLength(ROUNDS)
    const back = firebaseShape(resetPrviLobby(p))
    expect(back).toMatchObject({ phase: 'lobby', round: 0, prvi: { level: 'ljuto' } })
    expect(prviOf(back).seen).toHaveLength(ROUNDS)
    expect(prviOf(back).titles).toBeUndefined()
  })
})
