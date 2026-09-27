import { BLEF_QUESTIONS, getBlefQuestion, type BlefQuestion } from '../data/blefQuestions'
import { asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { BlefOption, BlefResult, BlefState } from './types'

/** Questions per game; the last one is worth double. */
export const TOTAL_QUESTIONS = 8
/** Every player should be able to choose from at least this many answers (their own fake excluded). */
export const MIN_CHOICES = 4
export const MAX_LIE_LENGTH = 30
export const TRUTH_POINTS = 2
export const FOOL_POINTS = 1

export function blefOf(pub: Pub): BlefState {
  return pub.blef ?? {}
}

/** Lowercase, no Serbian diacritics, no punctuation, single spaces: "Kući!" and "kuci" match. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/** True when a typed fake is really the right answer, or one typo away from it. */
export function isTruth(question: BlefQuestion, text: string): boolean {
  const typed = normalizeAnswer(text)
  if (!typed) return false
  return [question.a, ...(question.alt ?? [])].some((ans) => {
    const right = normalizeAnswer(ans)
    return typed === right || (right.length >= 5 && editDistance(typed, right) <= 1)
  })
}

/** This game's questions: ones not asked in this room yet, or any if the room has seen them all. */
export function drawQuestions(seen: string[], rng: Rng): string[] {
  const done = new Set(seen)
  const fresh = BLEF_QUESTIONS.filter((q) => !done.has(q.id))
  const pool = fresh.length >= TOTAL_QUESTIONS ? fresh : BLEF_QUESTIONS
  return shuffle(pool, rng)
    .slice(0, TOTAL_QUESTIONS)
    .map((q) => q.id)
}

export function currentQuestion(pub: Pub): BlefQuestion {
  const ids = asList<string>(blefOf(pub).questions)
  return getBlefQuestion(ids[Math.max(pub.round, 1) - 1] ?? '')
}

export function isFinalRound(pub: Pub): boolean {
  return pub.round >= TOTAL_QUESTIONS
}

export function allWrote(pub: Pub): boolean {
  const lies = blefOf(pub).lies ?? {}
  return playerOrder(pub).every((uid) => lies[uid])
}

export function allPicked(pub: Pub): boolean {
  const picks = blefOf(pub).picks ?? {}
  return playerOrder(pub).every((uid) => picks[uid])
}

export function optionsOf(pub: Pub): BlefOption[] {
  return asList<BlefOption>(blefOf(pub).options)
}

/**
 * The answers to pick from: the truth, every player's fake (the same fake written twice shows once),
 * and as many house fakes as it takes for everyone to have MIN_CHOICES that aren't their own.
 */
export function buildOptions(pub: Pub, question: BlefQuestion, rng: Rng): BlefOption[] {
  const lies = blefOf(pub).lies ?? {}
  const byText = new Map<string, BlefOption>()
  for (const uid of playerOrder(pub)) {
    const text = lies[uid]?.trim()
    if (!text || isTruth(question, text)) continue
    const key = normalizeAnswer(text)
    const same = byText.get(key)
    if (same) same.owners!.push(uid)
    else byText.set(key, { id: '', text, kind: 'lie', owners: [uid] })
  }
  const playerFakes = [...byText.values()]
  const needed = Math.max(0, MIN_CHOICES + 1 - (1 + playerFakes.length))
  const house = shuffle(
    question.fakes.filter((f) => !byText.has(normalizeAnswer(f))),
    rng,
  )
    .slice(0, needed)
    .map((text): BlefOption => ({ id: '', text, kind: 'house' }))
  const all: BlefOption[] = [{ id: '', text: question.a, kind: 'truth' }, ...playerFakes, ...house]
  return shuffle(all, rng).map((o, i) => ({ ...o, id: `o${i}` }))
}

/**
 * Scoring (all doubled on the last question):
 *  - picking the real answer: +2
 *  - each other player who picks your fake: +1
 *  - picking a house fake gives nobody anything
 */
export function scoreBlef(pub: Pub): BlefResult {
  const order = playerOrder(pub)
  const options = optionsOf(pub)
  const picks = blefOf(pub).picks ?? {}
  const times = isFinalRound(pub) ? 2 : 1
  const gains: BlefResult['gains'] = {}
  const fooled: Record<string, number> = {}
  for (const uid of order) gains[uid] = { points: 0, reasons: [] }

  for (const uid of order) {
    const pick = options.find((o) => o.id === picks[uid])
    if (!pick) continue
    if (pick.kind === 'truth') {
      gains[uid].points += TRUTH_POINTS * times
      gains[uid].reasons!.push('Pronašao istinu')
    }
    if (pick.kind === 'lie')
      for (const owner of asList<string>(pick.owners)) {
        if (owner === uid || !gains[owner]) continue
        gains[owner].points += FOOL_POINTS * times
        fooled[owner] = (fooled[owner] ?? 0) + 1
      }
  }
  for (const [uid, n] of Object.entries(fooled)) gains[uid].reasons!.push(n === 1 ? 'Prevario 1 igrača' : `Prevario ${n} igrača`)
  if (times > 1) for (const uid of order) if (gains[uid].points) gains[uid].reasons!.push('duplo')
  return { round: pub.round, gains }
}

export function applyBlef(pub: Pub, result: BlefResult): Pub {
  const scores = { ...(pub.scores ?? {}) }
  for (const [uid, g] of Object.entries(result.gains)) scores[uid] = (scores[uid] ?? 0) + g.points
  return { ...pub, scores, phase: 'truth', blef: { ...blefOf(pub), result } }
}

export function startBlef(pub: Pub, rng: Rng): Pub {
  const seen = asList<string>(blefOf(pub).seen)
  const questions = drawQuestions(seen, rng)
  const fresh = questions.filter((id) => !seen.includes(id))
  return {
    ...pub,
    phase: 'write',
    round: 1,
    scores: Object.fromEntries(playerOrder(pub).map((uid) => [uid, 0])),
    // once every question has been asked, start the history over
    blef: { questions, seen: fresh.length === questions.length ? [...seen, ...questions] : questions },
  }
}

export function nextBlefRound(pub: Pub): Pub {
  if (isFinalRound(pub)) return { ...pub, phase: 'over' }
  const { questions, seen } = blefOf(pub)
  return { ...pub, phase: 'write', round: pub.round + 1, blef: { questions, seen } }
}

export function resetBlefLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, blef: { seen: blefOf(pub).seen } }
}
