import { KVIZ_QUESTIONS, KVIZ_TOPICS, type KvizLevel, type KvizQuestion, type KvizTopic } from '../data/kvizQuestions'
import { addStats, asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import { CARDS, type CardId, type SpecialId } from './cards'
import type { Attack, KvizResult, KvizState } from './types'

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
/** Seconds to answer in a Munja round. */
export const MUNJA_SECONDS = 5
/** Splash before a special round, so everyone reads what's coming. */
export const SPLASH_SECONDS = 3
/** Special rounds per game, never on the first question. */
export const SPECIAL_ROUNDS = 3
/** Attack cards each player starts with. */
export const START_CARDS = 2
/** After these questions, whoever is last gets one more card. */
export const BONUS_AFTER = [5, 10]
/** Zamrzni takes this much off the victim's clock, but always leaves a moment to react. */
export const FREEZE_MS = 5000
export const FREEZE_MIN_LEFT_MS = 1500
/** Timed attacks: how long Magla blurs and Kasni start hides the options. */
export const BLUR_MS = 4000
export const LATE_MS = 4000
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

/** How long the current question gives to answer (ms). */
export function answerMs(pub: Pub): number {
  return kvizOf(pub).answerMs ?? ANSWER_SECONDS * 1000
}

/** When the current question becomes visible (after any lead-in or splash), server clock. */
export function questionStart(pub: Pub): number {
  return (kvizOf(pub).endsAt ?? 0) - answerMs(pub)
}

/** Milliseconds left to answer for everyone, by the shared (server) clock. Above answerMs() means the lead-in. */
export function timeLeft(pub: Pub, now: number): number {
  return Math.max(0, (kvizOf(pub).endsAt ?? 0) - now)
}

/** When this player's answering closes: earlier if someone froze them. */
export function deadlineFor(pub: Pub, uid: string): number {
  const endsAt = kvizOf(pub).endsAt ?? 0
  const attack = kvizOf(pub).attacks?.[uid]
  if (attack?.card !== 'zamrzni') return endsAt
  return Math.min(endsAt, Math.max(attack.at + FREEZE_MIN_LEFT_MS, endsAt - FREEZE_MS))
}

/** Milliseconds this player has left to answer. */
export function myTimeLeft(pub: Pub, uid: string, now: number): number {
  return Math.max(0, Math.min(deadlineFor(pub, uid), kvizOf(pub).endsAt ?? 0) - now)
}

export function specialOf(pub: Pub, round = pub.round): SpecialId | undefined {
  return kvizOf(pub).specials?.[`r${round}`]
}

export function handOf(pub: Pub, uid: string): CardId[] {
  return asList<CardId>(kvizOf(pub).hands?.[uid])
}

export function attackOn(pub: Pub, uid: string): Attack | undefined {
  return kvizOf(pub).attacks?.[uid]
}

/** Whether `from` already played a card on this question. */
export function hasAttacked(pub: Pub, from: string): boolean {
  return Object.values(kvizOf(pub).attacks ?? {}).some((a) => a.from === from)
}

/** Friends `from` may attack right now: still answering, not already hit, with time left. */
export function targets(pub: Pub, from: string, now: number): string[] {
  const answers = kvizOf(pub).answers ?? {}
  return playerOrder(pub).filter(
    (uid) => uid !== from && answers[uid] === undefined && !attackOn(pub, uid) && myTimeLeft(pub, uid, now) > 1000,
  )
}

/** Plays `card` from `from`'s hand on `victim`, or returns undefined if that isn't allowed now. */
export function playCard(pub: Pub, from: string, card: CardId, victim: string, now: number): Pub | undefined {
  const hand = handOf(pub, from)
  const i = hand.indexOf(card)
  if (pub.phase !== 'question' || i < 0 || hasAttacked(pub, from)) return undefined
  if (now < questionStart(pub) || !targets(pub, from, now).includes(victim)) return undefined
  const kviz = kvizOf(pub)
  return {
    ...pub,
    kviz: {
      ...kviz,
      hands: { ...kviz.hands, [from]: hand.filter((_, j) => j !== i) },
      attacks: { ...kviz.attacks, [victim]: { card, from, at: now } },
    },
  }
}

function drawCards(n: number, rng: Rng): CardId[] {
  return Array.from({ length: n }, () => CARDS[Math.floor(rng() * CARDS.length)].id)
}

/** Special rounds for a game: SPECIAL_ROUNDS different kinds on different questions, never the first. */
export function drawSpecials(total: number, rng: Rng): Record<string, SpecialId> {
  const kinds = shuffle(['dupli', 'munja', 'haos', 'pljacka'] as SpecialId[], rng)
  const rounds = shuffle(
    Array.from({ length: total - 1 }, (_, i) => i + 2),
    rng,
  ).slice(0, SPECIAL_ROUNDS)
  return Object.fromEntries(rounds.map((r, i) => [`r${r}`, kinds[i % kinds.length]]))
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

/** Sets up question `round`: shuffled options, its clock (with a lead-in or splash) and Haos attacks. */
function newQuestion(pub: Pub, kviz: KvizState, round: number, rng: Rng, now: number): KvizState {
  const special = kviz.specials?.[`r${round}`]
  const answer = (special === 'munja' ? MUNJA_SECONDS : ANSWER_SECONDS) * 1000
  const lead = (round === 1 ? LEAD_SECONDS : special ? SPLASH_SECONDS : 0) * 1000
  const start = now + lead
  const attacks: Record<string, Attack> | undefined =
    special === 'haos'
      ? Object.fromEntries(playerOrder(pub).map((uid) => [uid, { card: drawCards(1, rng)[0], from: 'haos', at: start }]))
      : undefined
  return {
    ...kviz,
    order: shuffle([0, 1, 2, 3], rng),
    answerMs: answer,
    endsAt: start + answer,
    nextAt: undefined,
    answers: undefined,
    attacks,
    result: undefined,
  }
}

export function allAnswered(pub: Pub): boolean {
  const answers = kvizOf(pub).answers ?? {}
  return playerOrder(pub).every((uid) => typeof answers[uid] === 'number')
}

/** Everyone has answered or run out of their own time (a frozen player's clock ends early). */
export function allDone(pub: Pub, now: number): boolean {
  const answers = kvizOf(pub).answers ?? {}
  return playerOrder(pub).every((uid) => typeof answers[uid] === 'number' || now >= deadlineFor(pub, uid) + GRACE_MS)
}

/**
 * One point for the right answer (two in Dupli poeni). Speed doesn't matter.
 * In Pljačka every right answer also takes a point from the leader (not from yourself).
 * Gains can be negative for a robbed leader.
 */
export function scoreKviz(pub: Pub): KvizResult {
  const { correct } = optionsOf(pub)
  const special = specialOf(pub)
  const answers = kvizOf(pub).answers ?? {}
  const gains: KvizResult['gains'] = {}
  const picks: Record<string, number> = {}
  const order = playerOrder(pub)
  for (const uid of order) {
    const pick = answers[uid]
    if (typeof pick === 'number') picks[uid] = pick
    gains[uid] =
      pick === correct
        ? { points: special === 'dupli' ? 2 : 1, reasons: [special === 'dupli' ? 'Tačno ×2' : 'Tačno'] }
        : { points: 0, reasons: [] }
  }
  if (special === 'pljacka') {
    const scores = pub.scores ?? {}
    const top = Math.max(...order.map((uid) => scores[uid] ?? 0))
    const leaders = order.filter((uid) => (scores[uid] ?? 0) === top && top > 0)
    const left = Object.fromEntries(leaders.map((uid) => [uid, scores[uid] ?? 0]))
    let i = 0
    for (const thief of order) {
      if (picks[thief] !== correct || leaders.includes(thief) || !leaders.length) continue
      const victim = leaders[i++ % leaders.length]
      if (left[victim] <= 0) continue
      left[victim]--
      gains[thief].points++
      gains[thief].reasons!.push('Pljačka')
      gains[victim].points--
      if (!gains[victim].reasons!.includes('Opljačkan')) gains[victim].reasons!.push('Opljačkan')
    }
  }
  return { round: pub.round, correct, picks, gains }
}

/** Players tied for last place. */
export function lastPlaced(pub: Pub): string[] {
  const scores = pub.scores ?? {}
  const order = playerOrder(pub)
  const low = Math.min(...order.map((uid) => scores[uid] ?? 0))
  return order.filter((uid) => (scores[uid] ?? 0) === low)
}

/** `now` is the server clock; the reveal lasts REVEAL_SECONDS from here. */
export function applyKviz(pub: Pub, result: KvizResult, now: number, rng: Rng = Math.random): Pub {
  const scores = { ...(pub.scores ?? {}) }
  const add: Record<string, Record<string, number>> = {}
  for (const [uid, g] of Object.entries(result.gains)) {
    scores[uid] = (scores[uid] ?? 0) + g.points
    const reasons = asList<string>(g.reasons)
    add[uid] = { right: reasons.some((r) => r.startsWith('Tačno')) ? 1 : 0, robs: reasons.includes('Pljačka') ? 1 : 0 }
  }
  let kviz: KvizState = { ...kvizOf(pub), result, nextAt: now + REVEAL_SECONDS * 1000 }
  // After questions 5 and 10, whoever is last gets a new card to fight back with.
  if (BONUS_AFTER.includes(pub.round) && pub.round < totalQuestions(pub)) {
    const bonus = lastPlaced({ ...pub, scores })
    const hands = { ...kviz.hands }
    for (const uid of bonus) hands[uid] = [...handOf(pub, uid), ...drawCards(1, rng)]
    kviz = { ...kviz, hands, result: { ...result, bonus } }
  }
  return { ...pub, scores, stats: addStats(pub.stats, add), phase: 'answer', kviz }
}

export function startKviz(pub: Pub, rng: Rng, now: number): Pub {
  const order = playerOrder(pub)
  const { queue, seen } = drawQueue(asList<string>(kvizOf(pub).seen), rng)
  const kviz: KvizState = {
    game: rng().toString(36).slice(2, 10),
    total: queue.length,
    seen,
    queue,
    specials: drawSpecials(queue.length, rng),
    hands: Object.fromEntries(order.map((uid) => [uid, drawCards(START_CARDS, rng)])),
  }
  return {
    ...pub,
    phase: 'question',
    round: 1,
    stats: undefined,
    scores: Object.fromEntries(order.map((uid) => [uid, 0])),
    kviz: newQuestion(pub, kviz, 1, rng, now),
  }
}

export function nextQuestion(pub: Pub, rng: Rng, now: number): Pub {
  if (pub.round >= totalQuestions(pub)) return { ...pub, phase: 'over' }
  return { ...pub, phase: 'question', round: pub.round + 1, kviz: newQuestion(pub, kvizOf(pub), pub.round + 1, rng, now) }
}

export function resetKvizLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, kviz: { seen: kvizOf(pub).seen } }
}
