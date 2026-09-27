import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../data/words'
import { applyRound, catchThreshold, isCaught, nextRound, pickerFor, scoreRound, setupRound } from './logic'
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
    phase: 'missions',
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
  impostor: 'd',
  word: 'Pica',
  category: 'hrana',
  options: ['Pica'],
  missions: { a: 'm1', b: 'm2', c: 'm3', d: 'm4' },
}

describe('scoring', () => {
  it('needs 2 of 3 votes to catch with four players', () => {
    expect(catchThreshold(4)).toBe(2)
    expect(catchThreshold(3)).toBe(1)
  })

  it('matches the example: two right votes, one fooled, one mission', () => {
    const p = pub({
      votes: { a: 'd', b: 'd', c: 'a', d: 'a' },
      missionVotes: { a: { c: true }, b: { c: true }, d: { c: false } },
    })
    const r = scoreRound(p, secret)
    expect(r.caught).toBe(true)
    expect(r.gains.a.points).toBe(1)
    expect(r.gains.b.points).toBe(1)
    expect(r.gains.c.points).toBe(1) // fooled by the impostor, but mission approved
    expect(r.gains.d.points).toBe(1) // fooled c
    expect(r.missions.c.approved).toBe(true)
  })

  it('gives a caught impostor +2 for guessing the word', () => {
    const p = pub({ votes: { a: 'd', b: 'd', c: 'd' }, guess: 'Pica' })
    const r = scoreRound(p, secret)
    expect(r.gains.d.points).toBe(2)
    expect(r.guessCorrect).toBe(true)
  })

  it('ignores a guess when the impostor escaped', () => {
    const p = pub({ votes: { a: 'b', b: 'c', c: 'd' }, guess: 'Pica' })
    expect(isCaught(p, 'd')).toBe(false)
    const r = scoreRound(p, secret)
    expect(r.gains.d.points).toBe(2) // two fooled voters, no steal
    expect(r.guessCorrect).toBe(false)
  })

  it('needs a majority of the others to approve a mission', () => {
    const p = pub({ votes: {}, missionVotes: { a: { b: true }, c: { b: false }, d: { b: false } } })
    expect(scoreRound(p, secret).missions.b.approved).toBe(false)
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
  it('gives everyone but the impostor the same word', () => {
    const s = setupRound(pub({ phase: 'category' }), 'muzika', seeded(7))
    const words = Object.values(s.tickets).map((t) => t.word)
    expect(words.filter((w) => w === null)).toHaveLength(1)
    expect(new Set(words.filter(Boolean))).toEqual(new Set([s.word]))
    expect(s.tickets[s.secret.impostor].word).toBeNull()
    expect(s.secret.options).toContain(s.word)
    expect(s.secret.options).toHaveLength(6)
    expect(new Set(Object.values(s.secret.missions)).size).toBe(4)
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
    const p = pub({ phase: 'score', votes: { a: 'b' }, guess: 'x' })
    expect(pickerFor(p)).toBe('a')
    const n = nextRound(p)
    expect(pickerFor(n)).toBe('b')
    expect(n.votes).toBeUndefined()
    expect(n.phase).toBe('category')
  })
})
