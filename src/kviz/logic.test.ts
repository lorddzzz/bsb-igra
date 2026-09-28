import { describe, expect, it } from 'vitest'
import { KVIZ_QUESTIONS, KVIZ_TOPICS } from '../data/kvizQuestions'
import type { Pub } from '../game/types'
import {
  allAnswered,
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
    const result = scoreKviz(p)
    expect(result.gains.a.points).toBe(1)
    expect(result.gains.b.points).toBe(0)
    expect(result.gains.c.points).toBe(0)
    expect(result.picks).toEqual({ a: correct, b: wrong })
    p = applyKviz(p, result, 20_000)
    expect(p.phase).toBe('answer')
    expect(p.scores).toEqual({ a: 1, b: 0, c: 0 })
    expect(p.kviz?.nextAt).toBe(20_000 + REVEAL_SECONDS * 1000)

    p = nextQuestion(p, rng, 30_000)
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
