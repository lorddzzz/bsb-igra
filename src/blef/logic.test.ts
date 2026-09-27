import { describe, expect, it } from 'vitest'
import { BLANK, BLEF_QUESTIONS, getBlefQuestion } from '../data/blefQuestions'
import type { Pub } from '../game/types'
import {
  allPicked,
  allWrote,
  applyBlef,
  buildOptions,
  currentQuestion,
  drawQuestions,
  isTruth,
  MIN_CHOICES,
  nextBlefRound,
  normalizeAnswer,
  resetBlefLobby,
  scoreBlef,
  startBlef,
  TOTAL_QUESTIONS,
} from './logic'
import type { BlefOption } from './types'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const players = {
  a: { name: 'Ana', badge: 'aj', joinedAt: 1 },
  b: { name: 'Bojan', badge: 'brian', joinedAt: 2 },
  c: { name: 'Ceca', badge: 'howie', joinedAt: 3 },
}

function pub(extra: Partial<Pub> = {}): Pub {
  return {
    hostUid: 'a',
    game: 'blef',
    createdAt: 0,
    mode: 'normal',
    phase: 'write',
    round: 1,
    players,
    scores: { a: 0, b: 0, c: 0 },
    blef: { questions: ['s01'], seen: ['s01'] },
    ...extra,
  }
}

const zamorce = getBlefQuestion('s01')

describe('question bank', () => {
  it('has enough well-formed questions', () => {
    expect(BLEF_QUESTIONS.length).toBeGreaterThanOrEqual(80)
    expect(new Set(BLEF_QUESTIONS.map((q) => q.id)).size).toBe(BLEF_QUESTIONS.length)
    for (const q of BLEF_QUESTIONS) {
      expect(q.q.split(BLANK), q.id).toHaveLength(2)
      expect(q.fakes, q.id).toHaveLength(2)
      for (const f of q.fakes) expect(isTruth(q, f), `${q.id}: ${f}`).toBe(false)
      expect(normalizeAnswer(q.fakes[0])).not.toBe(normalizeAnswer(q.fakes[1]))
    }
  })

  it('is roughly two thirds world facts, one third music', () => {
    const world = BLEF_QUESTIONS.filter((q) => q.topic === 'svet').length
    expect(world / BLEF_QUESTIONS.length).toBeGreaterThan(0.55)
    expect(world / BLEF_QUESTIONS.length).toBeLessThan(0.75)
  })
})

describe('answers', () => {
  it('ignores case, diacritics and punctuation', () => {
    expect(normalizeAnswer('  Zamorče! ')).toBe('zamorce')
    expect(normalizeAnswer('Đak')).toBe('djak')
  })

  it('refuses the real answer as a fake, even with a typo', () => {
    expect(isTruth(zamorce, 'ZAMORCE')).toBe(true)
    expect(isTruth(zamorce, 'zamorče')).toBe(true)
    expect(isTruth(zamorce, 'zamorcee')).toBe(true)
    expect(isTruth(zamorce, 'morsko prase')).toBe(true)
    expect(isTruth(zamorce, 'mačku')).toBe(false)
    expect(isTruth(zamorce, '')).toBe(false)
  })
})

describe('questions per game', () => {
  it('draws 8 new ones, and starts over once the room has seen them all', () => {
    const first = drawQuestions([], seeded(1))
    expect(first).toHaveLength(TOTAL_QUESTIONS)
    expect(new Set(first).size).toBe(TOTAL_QUESTIONS)
    const second = drawQuestions(first, seeded(2))
    expect(second.some((id) => first.includes(id))).toBe(false)
    const almostAll = BLEF_QUESTIONS.slice(3).map((q) => q.id)
    expect(drawQuestions(almostAll, seeded(3))).toHaveLength(TOTAL_QUESTIONS)
  })

  it('remembers asked questions across games in the room', () => {
    let p = startBlef(pub({ phase: 'lobby', round: 0, blef: {} }), seeded(4))
    const firstGame = p.blef!.questions!
    expect(p.blef!.seen).toEqual(firstGame)
    p = startBlef(resetBlefLobby(p), seeded(5))
    expect(p.blef!.seen).toHaveLength(TOTAL_QUESTIONS * 2)
    expect(p.blef!.questions!.some((id) => firstGame.includes(id))).toBe(false)
  })
})

describe('options', () => {
  it('gives three players at least four choices each, using house fakes', () => {
    const p = pub({ blef: { questions: ['s01'], lies: { a: 'papagaja', b: 'zeca', c: 'psa' } } })
    const opts = buildOptions(p, zamorce, seeded(7))
    expect(opts).toHaveLength(MIN_CHOICES + 1)
    expect(opts.filter((o) => o.kind === 'truth')).toHaveLength(1)
    // 'papagaja' is also a house fake, so the house brings the other one
    expect(opts.filter((o) => o.kind === 'house').map((o) => o.text)).toEqual(['zlatnu ribicu'])
    for (const uid of ['a', 'b', 'c'])
      expect(opts.filter((o) => !o.owners?.includes(uid)).length).toBeGreaterThanOrEqual(MIN_CHOICES)
    expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length)
  })

  it('merges the same fake written twice', () => {
    const p = pub({ blef: { lies: { a: 'Mačku', b: 'macku!', c: 'psa' } } })
    const opts = buildOptions(p, zamorce, seeded(8))
    const cat = opts.find((o) => normalizeAnswer(o.text) === 'macku')!
    expect(cat.owners).toEqual(['a', 'b'])
    expect(opts).toHaveLength(5)
  })

  it('needs no house fakes with four players', () => {
    const p = pub({
      players: { ...players, d: { name: 'Dule', badge: 'nick', joinedAt: 4 } },
      blef: { lies: { a: 'mačku', b: 'zeca', c: 'psa', d: 'kozu' } },
    })
    expect(buildOptions(p, zamorce, seeded(9)).filter((o) => o.kind === 'house')).toHaveLength(0)
  })
})

describe('scoring', () => {
  const options: BlefOption[] = [
    { id: 'o0', text: 'zamorče', kind: 'truth' },
    { id: 'o1', text: 'mačku', kind: 'lie', owners: ['a'] },
    { id: 'o2', text: 'psa', kind: 'lie', owners: ['b', 'c'] },
    { id: 'o3', text: 'papagaja', kind: 'house' },
  ]

  it('gives +2 for the truth and +1 per friend fooled', () => {
    const p = pub({ phase: 'pick', blef: { questions: ['s01'], options, picks: { a: 'o2', b: 'o0', c: 'o1' } } })
    const r = scoreBlef(p)
    expect(r.gains.a.points).toBe(1) // fooled c
    expect(r.gains.b.points).toBe(3) // truth, plus fooled a
    expect(r.gains.c.points).toBe(1) // fooled a
    const after = applyBlef(p, r)
    expect(after.phase).toBe('truth')
    expect(after.scores).toEqual({ a: 1, b: 3, c: 1 })
  })

  it('gives nothing for a house fake', () => {
    const p = pub({ phase: 'pick', blef: { options, picks: { a: 'o3', b: 'o3', c: 'o3' } } })
    const r = scoreBlef(p)
    expect(Object.values(r.gains).map((g) => g.points)).toEqual([0, 0, 0])
  })

  it('doubles everything on the last question', () => {
    const p = pub({ phase: 'pick', round: TOTAL_QUESTIONS, blef: { options, picks: { a: 'o0', b: 'o1', c: 'o0' } } })
    const r = scoreBlef(p)
    expect(r.gains.a.points).toBe(4 + 2)
    expect(r.gains.c.points).toBe(4)
  })
})

describe('flow', () => {
  it('waits for everyone, then moves through 8 questions to the end', () => {
    expect(allWrote(pub({ blef: { lies: { a: 'x', b: 'y' } } }))).toBe(false)
    expect(allWrote(pub({ blef: { lies: { a: 'x', b: 'y', c: 'z' } } }))).toBe(true)
    expect(allPicked(pub({ blef: { picks: { a: 'o1', b: 'o2', c: 'o0' } } }))).toBe(true)

    let p = startBlef(pub({ phase: 'lobby', round: 0 }), seeded(11))
    const ids = p.blef!.questions!
    for (let round = 1; round <= TOTAL_QUESTIONS; round++) {
      expect(p.phase).toBe('write')
      expect(currentQuestion(p).id).toBe(ids[round - 1])
      p = nextBlefRound({ ...p, phase: 'truth', blef: { ...p.blef, lies: { a: 'x' }, picks: { a: 'o1' } } })
      if (round < TOTAL_QUESTIONS) expect(p.blef!.lies).toBeUndefined()
    }
    expect(p.phase).toBe('over')
  })
})
