import { KVIZ_QUESTIONS, type KvizQuestion } from '../data/kvizQuestions'
import { asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { KvizResult, KvizState } from './types'

export const QUESTIONS_PER_GAME = 15
/** Seconds to answer each question. */
export const ANSWER_SECONDS = 10
/** How long the right answer stays up before the next question starts on its own. */
export const REVEAL_SECONDS = 4
/** A countdown before the first question, so nobody misses it while reading the lobby. */
export const LEAD_SECONDS = 3
/** Extra time the host waits past zero, so a tap in the last moment still reaches the database. */
export const GRACE_MS = 1000
/** How many questions of each topic a game has; the rest are 'svet'. */
export const QUOTAS: Partial<Record<KvizQuestion['topic'], number>> = { bsb: 2, muzika: 3 }

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

/** Seconds on the clock for this question: the first one also gets the lead-in countdown. */
export function leadSeconds(round: number): number {
  return round === 1 ? LEAD_SECONDS : 0
}

/**
 * This game's questions: QUOTAS of music and Backstreet Boys, the rest world facts, none asked
 * in this room before (a topic starts over once it runs out). Shuffled so topics come in any order.
 */
export function drawQueue(seen: string[], rng: Rng, count = QUESTIONS_PER_GAME): { queue: string[]; seen: string[] } {
  const topics = [...new Set(KVIZ_QUESTIONS.map((q) => q.topic))]
  const picked: string[] = []
  let nextSeen = [...seen]
  for (const topic of topics) {
    const want = topic === 'svet' ? count - Object.values(QUOTAS).reduce((s, n) => s + (n ?? 0), 0) : (QUOTAS[topic] ?? 0)
    const all = KVIZ_QUESTIONS.filter((q) => q.topic === topic).map((q) => q.id)
    let pool = all.filter((id) => !nextSeen.includes(id))
    if (pool.length < want) {
      nextSeen = nextSeen.filter((id) => !all.includes(id))
      pool = all
    }
    const take = shuffle(pool, rng).slice(0, want)
    picked.push(...take)
    nextSeen.push(...take)
  }
  return { queue: shuffle(picked, rng), seen: nextSeen }
}

function newQuestion(kviz: KvizState, rng: Rng): KvizState {
  return { ...kviz, order: shuffle([0, 1, 2, 3], rng), answers: undefined, result: undefined }
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

export function applyKviz(pub: Pub, result: KvizResult): Pub {
  const scores = { ...(pub.scores ?? {}) }
  for (const [uid, g] of Object.entries(result.gains)) scores[uid] = (scores[uid] ?? 0) + g.points
  return { ...pub, scores, phase: 'answer', kviz: { ...kvizOf(pub), result } }
}

export function startKviz(pub: Pub, rng: Rng): Pub {
  const order = playerOrder(pub)
  const { queue, seen } = drawQueue(asList<string>(kvizOf(pub).seen), rng)
  return {
    ...pub,
    phase: 'question',
    round: 1,
    scores: Object.fromEntries(order.map((uid) => [uid, 0])),
    kviz: newQuestion({ game: rng().toString(36).slice(2, 10), total: queue.length, seen, queue }, rng),
  }
}

export function nextQuestion(pub: Pub, rng: Rng): Pub {
  if (pub.round >= totalQuestions(pub)) return { ...pub, phase: 'over' }
  return { ...pub, phase: 'question', round: pub.round + 1, kviz: newQuestion(kvizOf(pub), rng) }
}

export function resetKvizLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, kviz: { seen: kvizOf(pub).seen } }
}
