import { describe, expect, it } from 'vitest'
import { CIJA_PROMPTS } from '../data/cijaPrompts'
import type { Pub } from '../game/types'
import { seededRng } from '../uljez/logic'
import { lobby } from '../test/sims'
import {
  allAnswered,
  allMatched,
  applyCija,
  cijaOf,
  cleanAnswer,
  closeAnswers,
  currentPrompt,
  DEFAULT_ROUNDS,
  drawPrompts,
  foolCap,
  guessersOf,
  isFinalRound,
  MAX_ANSWER_LENGTH,
  nextCijaRound,
  orderOf,
  resetCijaLobby,
  roundsOf,
  scoreCija,
  startCija,
  validMatching,
} from './logic'

const board = (n: number, guesses: Record<string, Record<string, string>> = {}): Pub => {
  const p = lobby('cija', n)
  const order = Object.keys(p.players ?? {})
  return {
    ...p,
    phase: 'match',
    round: 1,
    scores: Object.fromEntries(order.map((u) => [u, 0])),
    cija: { rounds: 3, order, prompts: ['l01', 'l02', 'l03'], answers: Object.fromEntries(order.map((u) => [u, `odgovor ${u}`])), guesses },
  }
}

describe('rounds and level', () => {
  it('keeps the number of questions between 2 and 5, and defaults to 3', () => {
    const at = (rounds: unknown) => roundsOf({ ...lobby('cija', 3), cija: { rounds: rounds as number } })
    expect(at(undefined)).toBe(DEFAULT_ROUNDS)
    expect(at(NaN)).toBe(DEFAULT_ROUNDS)
    expect(at(0)).toBe(DEFAULT_ROUNDS)
    expect(at(1)).toBe(2)
    expect(at(4)).toBe(4)
    expect(at(9)).toBe(5)
  })
})

describe('prompts', () => {
  it('draws only prompts of the chosen level, without repeats', () => {
    for (const level of ['lagano', 'srednje', 'ljuto'] as const) {
      const ids = drawPrompts(level, [], 5, seededRng(1))
      expect(new Set(ids).size).toBe(5)
      for (const id of ids) expect(CIJA_PROMPTS.find((p) => p.id === id)?.level).toBe(level)
    }
  })

  it('brings new prompts to a room that has already seen some, and repeats only when a level runs out', () => {
    const first = drawPrompts('lagano', [], 5, seededRng(2))
    const second = drawPrompts('lagano', first, 5, seededRng(3))
    expect(second.filter((id) => first.includes(id))).toEqual([])
    const all = CIJA_PROMPTS.filter((p) => p.level === 'lagano').map((p) => p.id)
    const last = drawPrompts('lagano', all.slice(0, all.length - 1), 3, seededRng(4))
    expect(last).toHaveLength(3)
    expect(last[0]).toBe(all[all.length - 1])
  })
})

describe('starting and moving between rounds', () => {
  it('starts at round 1 with zero scores and the host\'s settings', () => {
    const pub = { ...lobby('cija', 4), cija: { level: 'ljuto' as const, rounds: 4 } }
    const started = startCija(pub, seededRng(5))
    expect(started).toMatchObject({ phase: 'write', round: 1, cija: { level: 'ljuto', rounds: 4 } })
    expect(cijaOf(started).prompts).toHaveLength(4)
    expect(Object.values(started.scores ?? {})).toEqual([0, 0, 0, 0])
    expect(currentPrompt(started).level).toBe('ljuto')
    expect(cijaOf(started).seen).toEqual(cijaOf(started).prompts)
  })

  it('clears answers and guesses for the next prompt and ends after the last', () => {
    const started = startCija(lobby('cija', 3), seededRng(6))
    const mid = nextCijaRound({ ...board(3), cija: { ...cijaOf(started), answers: { a: 'x' }, guesses: { a: {} } }, round: 1 })
    expect(mid).toMatchObject({ phase: 'write', round: 2 })
    expect(cijaOf(mid).answers).toBeUndefined()
    expect(cijaOf(mid).guesses).toBeUndefined()
    expect(cijaOf(mid).prompts).toEqual(cijaOf(started).prompts)
    const lastRound = { ...mid, round: DEFAULT_ROUNDS }
    expect(isFinalRound(lastRound)).toBe(true)
    expect(nextCijaRound(lastRound).phase).toBe('over')
  })

  it('goes back to the lobby keeping the settings and the prompts already seen', () => {
    const over = { ...startCija({ ...lobby('cija', 3), cija: { level: 'srednje', rounds: 2 } }, seededRng(7)), phase: 'over' as const }
    const again = resetCijaLobby(over)
    expect(again).toMatchObject({ phase: 'lobby', round: 0, cija: { level: 'srednje', rounds: 2 } })
    expect(cijaOf(again).seen).toEqual(cijaOf(over).prompts)
    expect(cijaOf(again).prompts).toBeUndefined()
  })
})

describe('answers', () => {
  it('tidies what was typed and cuts it to the limit', () => {
    expect(cleanAnswer('   dosta   razmaka  ')).toBe('dosta razmaka')
    expect(cleanAnswer('')).toBe('')
    expect(cleanAnswer('x'.repeat(200))).toHaveLength(MAX_ANSWER_LENGTH)
  })

  it('waits for everyone, then shuffles all players onto the board and tells equal answers apart', () => {
    const pub = startCija(lobby('cija', 4), seededRng(8))
    const partial = { ...pub, cija: { ...cijaOf(pub), answers: { a: 'Pica', b: 'pica!', c: 'Burek' } } }
    expect(allAnswered(partial)).toBe(false)
    const full = { ...partial, cija: { ...cijaOf(partial), answers: { ...cijaOf(partial).answers, d: 'PICA' } } }
    expect(allAnswered(full)).toBe(true)
    const closed = closeAnswers(full, seededRng(9))
    expect(closed.phase).toBe('match')
    expect([...orderOf(closed)].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(cijaOf(closed).answers).toEqual({ a: 'Pica', b: 'pica! (2)', c: 'Burek', d: 'PICA (3)' })
  })

  it('does not count a blank answer as an answer', () => {
    const pub = startCija(lobby('cija', 3), seededRng(10))
    expect(allAnswered({ ...pub, cija: { ...cijaOf(pub), answers: { a: 'x', b: '   ', c: 'y' } } })).toBe(false)
  })
})

describe('a valid set of guesses', () => {
  const pub = board(4)
  it('matches every answer but your own to a different friend, each friend once', () => {
    expect(validMatching(pub, 'a', { b: 'c', c: 'd', d: 'b' })).toBe(true)
    expect(validMatching(pub, 'a', { b: 'b', c: 'c', d: 'd' })).toBe(true)
  })
  it('refuses an incomplete set, your own answer, yourself as a friend, a repeated friend and strangers', () => {
    expect(validMatching(pub, 'a', { b: 'c', c: 'd' })).toBe(false)
    expect(validMatching(pub, 'a', { a: 'b', b: 'c', c: 'd' })).toBe(false)
    expect(validMatching(pub, 'a', { b: 'a', c: 'c', d: 'd' })).toBe(false)
    expect(validMatching(pub, 'a', { b: 'c', c: 'c', d: 'd' })).toBe(false)
    expect(validMatching(pub, 'a', { b: 'x', c: 'c', d: 'd' })).toBe(false)
    expect(validMatching(pub, 'a', { b: 'b', c: 'c', d: 'd', e: 'e' })).toBe(false)
    expect(validMatching(pub, 'a', null)).toBe(false)
    expect(validMatching(pub, 'a', 'b')).toBe(false)
    expect(validMatching(pub, 'zz', { b: 'c', c: 'd', d: 'b' })).toBe(false)
  })
  it('knows when everybody has matched', () => {
    const some = board(3, { a: { b: 'b', c: 'c' }, b: { a: 'a', c: 'c' } })
    expect(allMatched(some)).toBe(false)
    const all = board(3, { a: { b: 'b', c: 'c' }, b: { a: 'a', c: 'c' }, c: { a: 'a', b: 'b' } })
    expect(allMatched(all)).toBe(true)
    // a half-finished entry that Firebase might hold is not a match
    expect(allMatched(board(3, { a: { b: 'b' }, b: { a: 'a', c: 'c' }, c: { a: 'a', b: 'b' } }))).toBe(false)
  })
})

describe('scoring', () => {
  // Four players, so at most 1 point per answer for fooling (half of 3 guessers, rounded down).
  const guesses = {
    a: { b: 'b', c: 'c', d: 'd' },
    b: { a: 'a', c: 'd', d: 'c' },
    c: { a: 'b', b: 'a', d: 'd' },
    d: { a: 'c', b: 'b', c: 'a' },
  }

  it('gives a point per right guess, and a capped point per fooled friend', () => {
    const result = scoreCija(board(4, guesses))
    expect(Object.fromEntries(Object.entries(result.gains).map(([u, g]) => [u, g.points]))).toEqual({ a: 4, b: 2, c: 2, d: 2 })
    expect(result.gains.a).toMatchObject({ right: 3, fooled: 1 })
    expect(result.gains.a.reasons).toEqual(['Pogođeno 3', 'Prevareno 1'])
    // c's answer was missed by two people, but only one point counts
    expect(guessersOf(board(4, guesses), 'c')).toEqual({ right: ['a'], wrong: ['b', 'd'] })
    expect(result.gains.c.fooled).toBe(1)
  })

  it('caps fooling at half of the guessers for any group size', () => {
    expect([3, 4, 5, 6, 7, 8].map(foolCap)).toEqual([1, 1, 2, 2, 3, 3])
    // nobody gets anyone right in a 8 player game: every author gets exactly the cap
    const players = Object.keys(board(8).players ?? {})
    const shift = Object.fromEntries(
      players.map((g) => {
        const owners = players.filter((o) => o !== g)
        // everyone names the next friend along, a cycle with no fixed points
        return [g, Object.fromEntries(owners.map((o, i) => [o, owners[(i + 1) % owners.length]]))]
      }),
    )
    const pub = board(8, shift)
    const result = scoreCija(pub)
    for (const g of Object.values(result.gains)) expect(g.fooled).toBeLessThanOrEqual(3)
    expect(Object.values(result.gains).reduce((sum, g) => sum + g.points, 0)).toBe(Object.values(result.gains).reduce((s, g) => s + (g.right ?? 0) + (g.fooled ?? 0), 0))
  })

  it('pays an author nothing when everyone got the answer right', () => {
    const everyoneRight = { a: { b: 'b', c: 'c' }, b: { a: 'a', c: 'c' }, c: { a: 'a', b: 'b' } }
    const result = scoreCija(board(3, everyoneRight))
    for (const g of Object.values(result.gains)) expect(g).toMatchObject({ points: 2, right: 2, fooled: 0 })
  })

  it('applies the points to the scores and counts the stats for the scoreboard', () => {
    const pub = board(4, guesses)
    const applied = applyCija(pub, scoreCija(pub))
    expect(applied.phase).toBe('result')
    expect(applied.scores).toEqual({ a: 4, b: 2, c: 2, d: 2 })
    expect(applied.stats?.a).toEqual({ guessed: 3, fooled: 1 })
    expect(applied.stats?.b).toEqual({ guessed: 1, fooled: 1 })
    // a second round adds on top
    const again = applyCija({ ...applied, round: 2 }, scoreCija({ ...pub, round: 2 }))
    expect(again.scores?.a).toBe(8)
    expect(again.stats?.a).toEqual({ guessed: 6, fooled: 2 })
  })
})
