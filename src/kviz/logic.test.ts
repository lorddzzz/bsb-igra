import { describe, expect, it } from 'vitest'
import { KVIZ_QUESTIONS } from '../data/kvizQuestions'
import type { Pub } from '../game/types'
import {
  allAnswered,
  applyKviz,
  currentQuestion,
  drawQueue,
  nextQuestion,
  optionsOf,
  QUESTIONS_PER_GAME,
  QUOTAS,
  resetKvizLobby,
  scoreKviz,
  startKviz,
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

describe('question bank', () => {
  it('has unique ids, 3 distinct wrong answers and no Cyrillic', () => {
    const ids = KVIZ_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of KVIZ_QUESTIONS) {
      expect(new Set([q.a, ...q.w]).size, q.id).toBe(4)
      expect(/[Ѐ-ӿ]/.test(q.q + q.a + q.w.join('')), q.id).toBe(false)
    }
  })
})

describe('drawQueue', () => {
  it('draws the topic mix without repeats', () => {
    const { queue, seen } = drawQueue([], seeded(1))
    expect(queue).toHaveLength(QUESTIONS_PER_GAME)
    expect(new Set(queue).size).toBe(QUESTIONS_PER_GAME)
    const topics = queue.map((id) => KVIZ_QUESTIONS.find((q) => q.id === id)!.topic)
    expect(topics.filter((t) => t === 'bsb')).toHaveLength(QUOTAS.bsb!)
    expect(topics.filter((t) => t === 'muzika')).toHaveLength(QUOTAS.muzika!)
    expect(seen).toEqual(expect.arrayContaining(queue))
  })

  it('never repeats a question until a topic runs out, then starts that topic over', () => {
    let seen: string[] = []
    const asked: string[] = []
    const rng = seeded(7)
    for (let game = 0; game < 12; game++) {
      const d = drawQueue(seen, rng)
      seen = d.seen
      asked.push(...d.queue)
    }
    const bsb = KVIZ_QUESTIONS.filter((q) => q.topic === 'bsb').length
    const firstBsb = asked.filter((id) => id.startsWith('b')).slice(0, bsb - (bsb % QUOTAS.bsb!))
    expect(new Set(firstBsb).size).toBe(firstBsb.length)
    expect(asked).toHaveLength(12 * QUESTIONS_PER_GAME)
  })
})

describe('a game', () => {
  it('starts, scores only the right answer and ends after the last question', () => {
    const rng = seeded(3)
    let p = startKviz(lobby(), rng)
    expect(p.phase).toBe('question')
    expect(p.round).toBe(1)
    expect(p.scores).toEqual({ a: 0, b: 0, c: 0 })

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
    p = applyKviz(p, result)
    expect(p.phase).toBe('answer')
    expect(p.scores).toEqual({ a: 1, b: 0, c: 0 })

    p = nextQuestion(p, rng)
    expect(p.phase).toBe('question')
    expect(p.round).toBe(2)
    expect(p.kviz?.answers).toBeUndefined()
    expect(p.kviz?.result).toBeUndefined()

    p = { ...p, round: QUESTIONS_PER_GAME, phase: 'answer' }
    expect(nextQuestion(p, rng).phase).toBe('over')
  })

  it('keeps the asked questions for the next game in the same room', () => {
    const rng = seeded(5)
    const first = startKviz(lobby(), rng)
    const again = startKviz(resetKvizLobby({ ...first, phase: 'over' }), rng)
    const overlap = again.kviz!.queue!.filter((id) => first.kviz!.queue!.includes(id))
    expect(overlap).toEqual([])
    expect(again.kviz!.game).not.toBe(first.kviz!.game)
  })

  it('counts everyone answered', () => {
    const p = { ...startKviz(lobby(), seeded(9)) }
    expect(allAnswered({ ...p, kviz: { ...p.kviz, answers: { a: 0, b: 1, c: 2 } } })).toBe(true)
  })
})
