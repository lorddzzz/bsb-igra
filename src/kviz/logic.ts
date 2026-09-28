import { KVIZ_QUESTIONS, KVIZ_TOPICS, type KvizLevel, type KvizQuestion, type KvizTopic } from '../data/kvizQuestions'
import { asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { KvizResult, KvizState } from './types'

export const QUESTIONS_PER_GAME = 15
/** Every topic gets at least this many questions per game; the rest go to random topics. */
export const MIN_PER_TOPIC = 2
/** Questions per game by difficulty: mostly easy, a few harder, one or two really hard. */
export const LEVELS: Record<KvizLevel, number> = { 1: 10, 2: 3, 3: 2 }
/** Seconds to answer each question. */
export const ANSWER_SECONDS = 10
/** How long the right answer stays up before the next question starts on its own. */
export const REVEAL_SECONDS = 4
/** A countdown before the first question, so nobody misses it while reading the lobby. */
export const LEAD_SECONDS = 3
/** Extra time past zero before the host closes, so a tap in the last moment still reaches the database. */
export const GRACE_MS = 800

export function kvizOf(pub: Pub): KvizState {
  return pub.kviz ?? {}
}

export function getQuestion(id: string | undefined): KvizQuestion {
  return KVIZ_QUESTIONS.find((q) => q.id === id) ?? KVIZ_QUESTIONS[0]
}

export function currentQuestion(pub: Pub): KvizQuestion {
  return getQuestion(asList<string>(kvizOf(pub).queue)[pub.round - 1])
}

export function totalQuestions(pub: Pub): number {
  return kvizOf(pub).total ?? QUESTIONS_PER_GAME
}

/** The current question's options in the order every phone shows them, and which one is right. */
export function optionsOf(pub: Pub): { texts: string[]; correct: number } {
  const q = currentQuestion(pub)
  const all = [q.a, ...q.w]
  const order = asList<number>(kvizOf(pub).order)
  const shown = order.length === 4 ? order : [0, 1, 2, 3]
  return { texts: shown.map((i) => all[i]), correct: shown.indexOf(0) }
}

/** Milliseconds left to answer, by the shared (server) clock. Above ANSWER_SECONDS means the lead-in. */
export function timeLeft(pub: Pub, now: number): number {
  return Math.max(0, (kvizOf(pub).endsAt ?? 0) - now)
}

/**
 * This game's questions: at least MIN_PER_TOPIC from every topic, the rest from random topics,
 * with LEVELS easy/medium/hard. None asked in this room before; a topic and level starts over
 * once it runs out.
 */
export function drawQueue(seen: string[], rng: Rng): { queue: string[]; seen: string[] } {
  const count = Object.values(LEVELS).reduce((s, n) => s + n, 0)
  const topics: KvizTopic[] = KVIZ_TOPICS.flatMap((t) => Array(MIN_PER_TOPIC).fill(t))
  while (topics.length < count) topics.push(KVIZ_TOPICS[Math.floor(rng() * KVIZ_TOPICS.length)])
  const levels = shuffle(
    (Object.entries(LEVELS) as [string, number][]).flatMap(([l, n]) => Array(n).fill(Number(l) as KvizLevel)),
    rng,
  )
  let nextSeen = [...seen]
  const queue: string[] = []
  shuffle(topics, rng).forEach((topic, i) => {
    let cell = KVIZ_QUESTIONS.filter((q) => q.topic === topic && q.level === levels[i] && !queue.includes(q.id))
    if (!cell.length) cell = KVIZ_QUESTIONS.filter((q) => q.topic === topic && !queue.includes(q.id))
    let pool = cell.filter((q) => !nextSeen.includes(q.id))
    if (!pool.length) {
      const ids = cell.map((q) => q.id)
      nextSeen = nextSeen.filter((id) => !ids.includes(id))
      pool = cell
    }
    const id = pool[Math.floor(rng() * pool.length)].id
    queue.push(id)
    nextSeen.push(id)
  })
  return { queue, seen: nextSeen }
}

function newQuestion(kviz: KvizState, rng: Rng, endsAt: number): KvizState {
  return { ...kviz, order: shuffle([0, 1, 2, 3], rng), endsAt, nextAt: undefined, answers: undefined, result: undefined }
}

export function allAnswered(pub: Pub): boolean {
  const answers = kvizOf(pub).answers ?? {}
  return playerOrder(pub).every((uid) => typeof answers[uid] === 'number')
}

/** One point for the right answer. Speed doesn't matter. */
export function scoreKviz(pub: Pub): KvizResult {
  const { correct } = optionsOf(pub)
  const answers = kvizOf(pub).answers ?? {}
  const gains: KvizResult['gains'] = {}
  const picks: Record<string, number> = {}
  for (const uid of playerOrder(pub)) {
    const pick = answers[uid]
    if (typeof pick === 'number') picks[uid] = pick
    gains[uid] = pick === correct ? { points: 1, reasons: ['Tačno'] } : { points: 0, reasons: [] }
  }
  return { round: pub.round, correct, picks, gains }
}

/** `now` is the server clock; the reveal lasts REVEAL_SECONDS from here. */
export function applyKviz(pub: Pub, result: KvizResult, now: number): Pub {
  const scores = { ...(pub.scores ?? {}) }
  for (const [uid, g] of Object.entries(result.gains)) scores[uid] = (scores[uid] ?? 0) + g.points
  return { ...pub, scores, phase: 'answer', kviz: { ...kvizOf(pub), result, nextAt: now + REVEAL_SECONDS * 1000 } }
}

export function startKviz(pub: Pub, rng: Rng, now: number): Pub {
  const order = playerOrder(pub)
  const { queue, seen } = drawQueue(asList<string>(kvizOf(pub).seen), rng)
  const endsAt = now + (LEAD_SECONDS + ANSWER_SECONDS) * 1000
  return {
    ...pub,
    phase: 'question',
    round: 1,
    scores: Object.fromEntries(order.map((uid) => [uid, 0])),
    kviz: newQuestion({ game: rng().toString(36).slice(2, 10), total: queue.length, seen, queue }, rng, endsAt),
  }
}

export function nextQuestion(pub: Pub, rng: Rng, now: number): Pub {
  if (pub.round >= totalQuestions(pub)) return { ...pub, phase: 'over' }
  const endsAt = now + ANSWER_SECONDS * 1000
  return { ...pub, phase: 'question', round: pub.round + 1, kviz: newQuestion(kvizOf(pub), rng, endsAt) }
}

export function resetKvizLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, kviz: { seen: kvizOf(pub).seen } }
}
