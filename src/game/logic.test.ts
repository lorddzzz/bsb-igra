import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../data/words'
import {
  allGuessed,
  asList,
  normalizeSecret,
  applyRound,
  catchThreshold,
  categoryChoices,
  caughtImpostors,
  impostorCount,
  isCaught,
  nextRound,
  pickerFor,
  scoreRound,
  setupRound,
} from './logic'
import type { Pub, Secret } from './types'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function pub(extra: Partial<Pub> = {}): Pub {
  return {
    hostUid: 'a',
    createdAt: 0,
    mode: 'quick',
    phase: 'reveal',
    round: 1,
    players: {
      a: { name: 'Ana', badge: 'aj', joinedAt: 1 },
      b: { name: 'Bojan', badge: 'brian', joinedAt: 2 },
      c: { name: 'Ceca', badge: 'howie', joinedAt: 3 },
      d: { name: 'Dule', badge: 'nick', joinedAt: 4 },
    },
    scores: { a: 0, b: 0, c: 0, d: 0 },
    ...extra,
  }
}

const secret: Secret = {
  round: 1,
  impostors: ['d'],
  word: 'Pica',
  category: 'hrana',
  options: ['Pica'],
}

const two: Secret = { ...secret, impostors: ['c', 'd'] }

describe('scoring', () => {
  it('needs 2 of 3 votes to catch with four players', () => {
    expect(catchThreshold(4)).toBe(2)
    expect(catchThreshold(3)).toBe(1)
  })

  it('matches the example: two right votes, one fooled', () => {
    const p = pub({ votes: { a: 'd', b: 'd', c: 'a', d: 'a' } })
    const r = scoreRound(p, secret)
    expect(r.caught).toEqual(['d'])
    expect(r.gains.a.points).toBe(1)
    expect(r.gains.b.points).toBe(1)
    expect(r.gains.c.points).toBe(0)
    expect(r.gains.d.points).toBe(1) // fooled c
  })

  it('gives a caught impostor +2 for guessing the word', () => {
    const p = pub({ votes: { a: 'd', b: 'd', c: 'd' }, guesses: { d: 'Pica' } })
    const r = scoreRound(p, secret)
    expect(r.gains.d.points).toBe(2)
    expect(r.guessedRight).toEqual(['d'])
  })

  it('ignores a guess when the impostor escaped', () => {
    const p = pub({ votes: { a: 'b', b: 'c', c: 'd' }, guesses: { d: 'Pica' } })
    expect(isCaught(p, 'd')).toBe(false)
    const r = scoreRound(p, secret)
    expect(r.gains.d.points).toBe(2) // two fooled voters, no steal
    expect(r.guessedRight).toEqual([])
  })

  it('with two impostors, a vote for either is right and each impostor gains from wrong votes', () => {
    const p = pub({ votes: { a: 'c', b: 'a', c: 'd', d: 'b' } })
    const r = scoreRound(p, two)
    expect(r.gains.a.points).toBe(1)
    expect(r.gains.b.points).toBe(0)
    expect(r.gains.c.points).toBe(1) // b fooled; impostor's own vote scores nothing
    expect(r.gains.d.points).toBe(1)
    expect(r.caught).toEqual([])
  })

  it('lets every caught impostor guess, and closes only when all have', () => {
    const p = pub({ votes: { a: 'c', b: 'c', c: 'd', d: 'b' } })
    expect(caughtImpostors(p, two)).toEqual(['c'])
    expect(allGuessed(p, two)).toBe(false)
    expect(allGuessed({ ...p, guesses: { c: 'Burek' } }, two)).toBe(true)
  })

  it('ends the game when someone reaches the target', () => {
    const p = pub({ scores: { a: 4, b: 0, c: 0, d: 0 }, votes: { a: 'd' } })
    const after = applyRound(p, scoreRound(p, secret))
    expect(after.phase).toBe('over')
    expect(after.scores?.a).toBe(5)
  })

  it('keeps going forever in endless mode', () => {
    const p = pub({ mode: 'endless', scores: { a: 99, b: 0, c: 0, d: 0 }, votes: { a: 'd' } })
    expect(applyRound(p, scoreRound(p, secret)).phase).toBe('score')
  })
})

describe('rounds', () => {
  it('gives everyone but the impostors the same word', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = setupRound(pub({ phase: 'category' }), 'muzika', seeded(seed))
      const words = Object.values(s.tickets).map((t) => t.word)
      expect(words.filter((w) => w === null)).toHaveLength(s.secret.impostors.length)
      expect(new Set(words.filter(Boolean))).toEqual(new Set([s.word]))
      for (const imp of s.secret.impostors) expect(s.tickets[imp].word).toBeNull()
      expect(s.secret.options).toContain(s.word)
      expect(s.secret.options).toHaveLength(6)
    }
  })

  it('picks 1 or 2 impostors, mostly 1, and never 2 with three players', () => {
    const rng = seeded(3)
    const counts = [0, 0, 0]
    for (let i = 0; i < 1000; i++) counts[impostorCount(4, rng)]++
    expect(counts[2]).toBeGreaterThan(200)
    expect(counts[2]).toBeLessThan(400)
    for (let i = 0; i < 100; i++) expect(impostorCount(3, rng)).toBe(1)
  })

  it('offers a few categories, stable within a round, not the last one', () => {
    const p = pub({ phase: 'category', round: 3, createdAt: 12345 })
    const first = categoryChoices(p).map((c) => c.id)
    expect(first).toHaveLength(4)
    expect(categoryChoices(p).map((c) => c.id)).toEqual(first)
    const last = { ...scoreRound(p, secret), category: first[0] }
    expect(categoryChoices({ ...p, last }).map((c) => c.id)).not.toContain(first[0])
  })

  it('every category has enough distinct words for the guess options', () => {
    for (const c of CATEGORIES) expect(new Set(c.words).size).toBeGreaterThanOrEqual(12)
  })

  it('does not repeat a used word while fresh ones remain', () => {
    const cat = CATEGORIES.find((c) => c.id === 'sport')!
    const used = cat.words.slice(1)
    for (let i = 1; i < 20; i++) {
      const s = setupRound(pub({ usedWords: used }), 'sport', seeded(i))
      expect(s.word).toBe(cat.words[0])
    }
  })

  it('rotates the category picker and clears the round', () => {
    const p = pub({ phase: 'score', votes: { a: 'b' }, guesses: { a: 'x' } })
    expect(pickerFor(p)).toBe('a')
    const n = nextRound(p)
    expect(pickerFor(n)).toBe('b')
    expect(n.votes).toBeUndefined()
    expect(n.guesses).toBeUndefined()
    expect(n.phase).toBe('category')
  })
})

describe('reading from the database', () => {
  it('accepts lists as arrays, numeric-key objects, or missing', () => {
    expect(asList(['a', 'b'])).toEqual(['a', 'b'])
    expect(asList({ 0: 'a', 1: 'b' })).toEqual(['a', 'b'])
    expect(asList(undefined)).toEqual([])
    expect(asList(true)).toEqual([])
  })

  it('upgrades a round secret written by the old version', () => {
    const s = normalizeSecret({ round: 1, impostor: 'd', word: 'Pica', category: 'hrana', options: { 0: 'Pica' } })
    expect(s?.impostors).toEqual(['d'])
    expect(s?.options).toEqual(['Pica'])
  })
})
