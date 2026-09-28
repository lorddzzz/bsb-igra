import { describe, expect, it } from 'vitest'
import { KVIZ_QUESTIONS, KVIZ_TOPICS } from '../data/kvizQuestions'
import type { Pub } from '../game/types'
import {
  allAnswered,
  allDone,
  attackOn,
  BONUS_AFTER,
  deadlineFor,
  drawSpecials,
  FREEZE_MS,
  handOf,
  MUNJA_SECONDS,
  myTimeLeft,
  playCard,
  questionStart,
  SPECIAL_ROUNDS,
  SPLASH_SECONDS,
  START_CARDS,
  targets,
  ANSWER_SECONDS,
  applyKviz,
  currentQuestion,
  drawQueue,
  LEAD_SECONDS,
  LEVELS,
  MIN_PER_TOPIC,
  nextQuestion,
  optionsOf,
  QUESTIONS_PER_GAME,
  resetKvizLobby,
  REVEAL_SECONDS,
  scoreKviz,
  startKviz,
  timeLeft,
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
  c: { name: 'Ceca', badge: 'howie', joinedAt: 3 },
}

function lobby(): Pub {
  return { hostUid: 'a', game: 'kviz', createdAt: 0, mode: 'normal', phase: 'lobby', round: 0, players }
}

const topicOf = (id: string) => KVIZ_QUESTIONS.find((q) => q.id === id)!.topic
const levelOf = (id: string) => KVIZ_QUESTIONS.find((q) => q.id === id)!.level

describe('question bank', () => {
  it('has 300+ questions, unique ids, 4 distinct options and no Cyrillic', () => {
    expect(KVIZ_QUESTIONS.length).toBeGreaterThanOrEqual(300)
    const ids = KVIZ_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of KVIZ_QUESTIONS) {
      expect(new Set([q.a, ...q.w].map((s) => s.trim().toLowerCase())).size, q.id).toBe(4)
      expect(/[Ѐ-ӿ]/.test(q.q + q.a + q.w.join('')), q.id).toBe(false)
      expect(KVIZ_TOPICS).toContain(q.topic)
    }
  })

  it('splits evenly over the topics, mostly easy', () => {
    for (const t of KVIZ_TOPICS) {
      const qs = KVIZ_QUESTIONS.filter((q) => q.topic === t)
      expect(qs.length, t).toBeGreaterThanOrEqual(70)
      expect(qs.filter((q) => q.level === 1).length / qs.length, t).toBeGreaterThan(0.6)
      expect(qs.filter((q) => q.level === 3).length, t).toBeGreaterThanOrEqual(LEVELS[3] * 2)
    }
  })
})

describe('drawQueue', () => {
  it('has every topic at least twice and the difficulty mix, without repeats', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { queue, seen } = drawQueue([], seeded(seed))
      expect(queue).toHaveLength(QUESTIONS_PER_GAME)
      expect(new Set(queue).size).toBe(QUESTIONS_PER_GAME)
      for (const t of KVIZ_TOPICS) expect(queue.filter((id) => topicOf(id) === t).length).toBeGreaterThanOrEqual(MIN_PER_TOPIC)
      for (const l of [1, 2, 3] as const) expect(queue.filter((id) => levelOf(id) === l)).toHaveLength(LEVELS[l])
      expect(seen).toEqual(expect.arrayContaining(queue))
    }
  })

  it('does not repeat a question across the games of one room for a long while', () => {
    let seen: string[] = []
    const asked: string[] = []
    const rng = seeded(7)
    for (let game = 0; game < 10; game++) {
      const d = drawQueue(seen, rng)
      seen = d.seen
      asked.push(...d.queue)
    }
    expect(new Set(asked).size).toBe(asked.length)
  })

  it('starts a topic and level over once it runs out', () => {
    let seen: string[] = []
    const rng = seeded(11)
    for (let game = 0; game < 60; game++) {
      const d = drawQueue(seen, rng)
      expect(new Set(d.queue).size).toBe(QUESTIONS_PER_GAME)
      seen = d.seen
    }
  })
})

describe('a game', () => {
  it('starts, scores only the right answer and ends after the last question', () => {
    const rng = seeded(3)
    let p = startKviz(lobby(), rng, 1000)
    expect(p.phase).toBe('question')
    expect(p.round).toBe(1)
    expect(p.scores).toEqual({ a: 0, b: 0, c: 0 })
    expect(p.kviz?.endsAt).toBe(1000 + (LEAD_SECONDS + ANSWER_SECONDS) * 1000)
    expect(timeLeft(p, 1000 + LEAD_SECONDS * 1000)).toBe(ANSWER_SECONDS * 1000)
    expect(timeLeft(p, 99_999)).toBe(0)

    const { texts, correct } = optionsOf(p)
    expect(texts[correct]).toBe(currentQuestion(p).a)
    expect(new Set(texts).size).toBe(4)

    const wrong = (correct + 1) % 4
    p = { ...p, kviz: { ...p.kviz, answers: { a: correct, b: wrong } } }
    expect(allAnswered(p)).toBe(false)
    const result = scoreKviz({ ...p, kviz: { ...p.kviz, specials: {} } })
    expect(result.gains.a.points).toBe(1)
    expect(result.gains.b.points).toBe(0)
    expect(result.gains.c.points).toBe(0)
    expect(result.picks).toEqual({ a: correct, b: wrong })
    p = applyKviz(p, result, 20_000)
    expect(p.phase).toBe('answer')
    expect(p.scores).toEqual({ a: 1, b: 0, c: 0 })
    expect(p.kviz?.nextAt).toBe(20_000 + REVEAL_SECONDS * 1000)

    p = nextQuestion({ ...p, kviz: { ...p.kviz, specials: {} } }, rng, 30_000)
    expect(p.phase).toBe('question')
    expect(p.round).toBe(2)
    expect(p.kviz?.endsAt).toBe(30_000 + ANSWER_SECONDS * 1000)
    expect(p.kviz?.answers).toBeUndefined()
    expect(p.kviz?.result).toBeUndefined()

    p = { ...p, round: QUESTIONS_PER_GAME, phase: 'answer' }
    expect(nextQuestion(p, rng, 0).phase).toBe('over')
  })

  it('keeps the asked questions for the next game in the same room', () => {
    const rng = seeded(5)
    const first = startKviz(lobby(), rng, 0)
    const again = startKviz(resetKvizLobby({ ...first, phase: 'over' }), rng, 0)
    const overlap = again.kviz!.queue!.filter((id) => first.kviz!.queue!.includes(id))
    expect(overlap).toEqual([])
    expect(again.kviz!.game).not.toBe(first.kviz!.game)
  })

  it('counts everyone answered', () => {
    const p = startKviz(lobby(), seeded(9), 0)
    expect(allAnswered({ ...p, kviz: { ...p.kviz, answers: { a: 0, b: 1, c: 2 } } })).toBe(true)
  })
})

/** A game on question 2 with no special round, questions visible from t=0 to t=10s. */
function playing(extra: Partial<NonNullable<Pub['kviz']>> = {}): Pub {
  const p = startKviz(lobby(), seeded(21), 0)
  return {
    ...p,
    round: 2,
    kviz: {
      ...p.kviz,
      specials: {},
      answerMs: 10_000,
      endsAt: 10_000,
      attacks: undefined,
      answers: undefined,
      hands: { a: ['magla', 'zamrzni'], b: ['mrak'], c: [] },
      ...extra,
    },
  }
}

describe('attack cards', () => {
  it('deals START_CARDS to everyone and SPECIAL_ROUNDS special rounds after the first question', () => {
    const p = startKviz(lobby(), seeded(4), 0)
    for (const uid of ['a', 'b', 'c']) expect(handOf(p, uid)).toHaveLength(START_CARDS)
    const specials = p.kviz!.specials!
    expect(Object.keys(specials)).toHaveLength(SPECIAL_ROUNDS)
    expect(new Set(Object.values(specials)).size).toBe(SPECIAL_ROUNDS)
    expect(specials.r1).toBeUndefined()
    for (let seed = 1; seed < 30; seed++) expect(drawSpecials(15, seeded(seed)).r1).toBeUndefined()
  })

  it('hits a friend who has not answered, uses up the card, one card per question', () => {
    let p = playing()
    expect(targets(p, 'a', 1000)).toEqual(['b', 'c'])
    p = playCard(p, 'a', 'magla', 'b', 1000)!
    expect(attackOn(p, 'b')).toEqual({ card: 'magla', from: 'a', at: 1000 })
    expect(handOf(p, 'a')).toEqual(['zamrzni'])
    // one card per question
    expect(playCard(p, 'a', 'zamrzni', 'c', 1200)).toBeUndefined()
    // b is already hit
    expect(targets(p, 'c', 1200)).toEqual(['a'])
    // not a card you hold, not yourself, not someone who answered
    expect(playCard(p, 'c', 'mrak', 'a', 1200)).toBeUndefined()
    expect(playCard(p, 'b', 'mrak', 'b', 1200)).toBeUndefined()
    const answered = { ...p, kviz: { ...p.kviz, answers: { a: 1 } } }
    expect(playCard(answered, 'b', 'mrak', 'a', 1200)).toBeUndefined()
    expect(playCard({ ...p, phase: 'answer' }, 'b', 'mrak', 'a', 1200)).toBeUndefined()
  })

  it('cannot attack during the lead-in or in the last second', () => {
    const p = playing({ endsAt: 13_000 })
    expect(questionStart(p)).toBe(3000)
    expect(playCard(p, 'a', 'magla', 'b', 2000)).toBeUndefined()
    expect(playCard(p, 'a', 'magla', 'b', 12_500)).toBeUndefined()
  })

  it('Zamrzni takes 5 s off, but leaves a moment to react', () => {
    const early = playCard(playing(), 'a', 'zamrzni', 'b', 1000)!
    expect(deadlineFor(early, 'b')).toBe(10_000 - FREEZE_MS)
    expect(deadlineFor(early, 'c')).toBe(10_000)
    expect(myTimeLeft(early, 'b', 5000)).toBe(0)
    const late = playCard(playing(), 'a', 'zamrzni', 'b', 7000)!
    expect(deadlineFor(late, 'b')).toBe(8500)
    // a frozen player who ran out counts as done
    const frozen = { ...early, kviz: { ...early.kviz, answers: { a: 0, c: 1 } } }
    expect(allDone(frozen, 4000)).toBe(false)
    expect(allDone(frozen, 6000)).toBe(true)
  })

  it('gives the last placed a card after questions 5 and 10', () => {
    const p = playing()
    const at5 = { ...p, round: BONUS_AFTER[0], scores: { a: 3, b: 1, c: 1 } }
    const out = applyKviz(at5, scoreKviz(at5), 0, seeded(2))
    expect(out.kviz!.result!.bonus).toEqual(['b', 'c'])
    expect(handOf(out, 'b')).toHaveLength(2)
    expect(handOf(out, 'c')).toHaveLength(1)
    expect(handOf(out, 'a')).toHaveLength(2)
    const at4 = { ...p, round: 4, scores: { a: 3, b: 1, c: 1 } }
    expect(applyKviz(at4, scoreKviz(at4), 0).kviz!.result!.bonus).toBeUndefined()
  })
})

describe('special rounds', () => {
  const withSpecial = (special: 'dupli' | 'munja' | 'haos' | 'pljacka') => {
    const p = playing()
    return { ...p, kviz: { ...p.kviz, specials: { r3: special } } }
  }

  it('Munja gives 5 seconds after a splash', () => {
    const p = nextQuestion(withSpecial('munja'), seeded(1), 0)
    expect(p.kviz!.answerMs).toBe(MUNJA_SECONDS * 1000)
    expect(p.kviz!.endsAt).toBe((SPLASH_SECONDS + MUNJA_SECONDS) * 1000)
  })

  it('Haos hits everyone with a random attack when the question appears', () => {
    const p = nextQuestion(withSpecial('haos'), seeded(1), 0)
    for (const uid of ['a', 'b', 'c']) {
      expect(attackOn(p, uid)?.from).toBe('haos')
      expect(attackOn(p, uid)?.at).toBe(SPLASH_SECONDS * 1000)
    }
    expect(targets(p, 'a', 5000)).toEqual([])
  })

  it('Dupli poeni doubles a right answer', () => {
    const p = { ...withSpecial('dupli'), round: 3 }
    const { correct } = optionsOf(p)
    const r = scoreKviz({ ...p, kviz: { ...p.kviz, answers: { a: correct } } })
    expect(r.gains.a.points).toBe(2)
  })

  it('Pljačka: right answers take a point from the leader, never below zero', () => {
    const p = { ...withSpecial('pljacka'), round: 3, scores: { a: 1, b: 0, c: 0 } }
    const { correct } = optionsOf(p)
    const r = scoreKviz({ ...p, kviz: { ...p.kviz, answers: { a: correct, b: correct, c: correct } } })
    expect(r.gains.a.points).toBe(0) // +1 right, -1 robbed
    expect(r.gains.b.points).toBe(2) // +1 right, +1 stolen
    expect(r.gains.c.points).toBe(1) // leader had nothing left
  })
})
