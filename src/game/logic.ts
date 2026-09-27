import { CATEGORIES, getCategory } from '../data/words'
import { MISSIONS } from '../data/missions'
import { MODES, type Pub, type RoundResult, type Secret, type Ticket } from './types'

export type Rng = () => number

export function pickOne<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Players in the order they joined. */
export function playerOrder(pub: Pub): string[] {
  return Object.entries(pub.players ?? {})
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    .map(([uid]) => uid)
}

/** Whoever picks the category this round; rotates through players each round. */
export function pickerFor(pub: Pub): string {
  const order = playerOrder(pub)
  return order[(Math.max(pub.round, 1) - 1) % order.length]
}

/** How many correct votes it takes to catch the impostor: 2 of 3 with four players. */
export function catchThreshold(playerCount: number): number {
  return Math.ceil((playerCount - 1) / 2)
}

export function targetFor(pub: Pub): number | null {
  return MODES.find((m) => m.id === pub.mode)?.target ?? null
}

export interface RoundSetup {
  tickets: Record<string, Ticket>
  secret: Secret
  starter: string
  word: string
}

export function setupRound(pub: Pub, categoryId: string, rng: Rng): RoundSetup {
  const order = playerOrder(pub)
  const category = getCategory(categoryId)
  const used = new Set(pub.usedWords ?? [])
  const fresh = category.words.filter((w) => !used.has(w))
  const word = pickOne(fresh.length ? fresh : category.words, rng)
  const impostor = pickOne(order, rng)
  const starter = pickOne(order, rng)
  const missionPool = shuffle(MISSIONS, rng)
  const missions: Record<string, string> = {}
  const tickets: Record<string, Ticket> = {}
  order.forEach((uid, i) => {
    missions[uid] = missionPool[i % missionPool.length]
    tickets[uid] = {
      round: pub.round,
      category: category.id,
      word: uid === impostor ? null : word,
      mission: missions[uid],
    }
  })
  const decoys = shuffle(
    category.words.filter((w) => w !== word),
    rng,
  ).slice(0, 5)
  const secret: Secret = {
    round: pub.round,
    impostor,
    word,
    category: category.id,
    options: shuffle([word, ...decoys], rng),
    missions,
  }
  return { tickets, secret, starter, word }
}

export function allVoted(pub: Pub): boolean {
  const votes = pub.votes ?? {}
  return playerOrder(pub).every((uid) => votes[uid])
}

export function allMissionsDone(pub: Pub): boolean {
  const done = pub.missionDone ?? {}
  return playerOrder(pub).every((uid) => done[uid])
}

export function votesAgainst(pub: Pub, target: string): number {
  return Object.entries(pub.votes ?? {}).filter(([voter, t]) => voter !== target && t === target).length
}

export function isCaught(pub: Pub, impostor: string): boolean {
  return votesAgainst(pub, impostor) >= catchThreshold(playerOrder(pub).length)
}

/**
 * Scoring:
 *  - you voted for the impostor: +1 for you
 *  - you voted for someone else: +1 for the impostor
 *  - caught impostor who guesses the word: +2 for the impostor
 *  - mission approved by most of the others: +1
 */
export function scoreRound(pub: Pub, secret: Secret): RoundResult {
  const order = playerOrder(pub)
  const votes = pub.votes ?? {}
  const gains: RoundResult['gains'] = {}
  for (const uid of order) gains[uid] = { points: 0, reasons: [] }
  const give = (uid: string, points: number, reason: string) => {
    if (!gains[uid]) return
    gains[uid].points += points
    gains[uid].reasons.push(reason)
  }

  const imp = secret.impostor
  let fooled = 0
  for (const voter of order) {
    if (voter === imp) continue
    const target = votes[voter]
    if (!target) continue
    if (target === imp) give(voter, 1, 'Pogodio uljeza')
    else fooled++
  }
  if (fooled) give(imp, fooled, fooled === 1 ? 'Prevario 1 igrača' : `Prevario ${fooled} igrača`)

  const caught = isCaught(pub, imp)
  const guessCorrect = caught && pub.guess === secret.word
  if (guessCorrect) give(imp, 2, 'Pogodio reč')

  const missions: RoundResult['missions'] = {}
  const mv = pub.missionVotes ?? {}
  for (const uid of order) {
    const others = order.filter((o) => o !== uid)
    const ups = others.filter((o) => mv[o]?.[uid] === true).length
    const approved = ups * 2 > others.length
    missions[uid] = { text: secret.missions[uid] ?? '', approved }
    if (approved) give(uid, 1, 'Misija')
  }

  return {
    round: secret.round,
    impostor: imp,
    word: secret.word,
    category: secret.category,
    caught,
    guessCorrect,
    gains,
    missions,
  }
}

/** Applies a scored round to the public state and moves to the score (or game over) screen. */
export function applyRound(pub: Pub, result: RoundResult): Pub {
  const scores = { ...(pub.scores ?? {}) }
  for (const [uid, g] of Object.entries(result.gains)) scores[uid] = (scores[uid] ?? 0) + g.points
  const target = targetFor(pub)
  const over = target !== null && Object.values(scores).some((s) => s >= target)
  return {
    ...pub,
    scores,
    last: result,
    usedWords: [...(pub.usedWords ?? []), result.word],
    phase: over ? 'over' : 'score',
  }
}

/** Leaders by score, highest first. */
export function standings(pub: Pub): { uid: string; score: number }[] {
  return playerOrder(pub)
    .map((uid) => ({ uid, score: pub.scores?.[uid] ?? 0 }))
    .sort((a, b) => b.score - a.score)
}

export function nextRound(pub: Pub): Pub {
  return {
    ...pub,
    phase: 'category',
    round: pub.round + 1,
    category: undefined,
    starter: undefined,
    votes: undefined,
    guess: undefined,
    missionVotes: undefined,
    missionDone: undefined,
  }
}

export function resetToLobby(pub: Pub): Pub {
  return {
    ...nextRound(pub),
    phase: 'lobby',
    round: 0,
    scores: undefined,
    last: undefined,
    usedWords: undefined,
  }
}

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPRSTUVZ'

export function makeRoomCode(rng: Rng): string {
  return Array.from({ length: 4 }, () => pickOne([...ROOM_ALPHABET], rng)).join('')
}

export { CATEGORIES }
