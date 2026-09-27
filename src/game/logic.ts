import { CATEGORIES, getCategory, type Category } from '../data/words'
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

/** Chance of a second impostor in a round, once there are enough players for it. */
export const TWO_IMPOSTOR_CHANCE = 0.3
export const MIN_PLAYERS_FOR_TWO = 4

export function impostorCount(playerCount: number, rng: Rng): number {
  return playerCount >= MIN_PLAYERS_FOR_TWO && rng() < TWO_IMPOSTOR_CHANCE ? 2 : 1
}

/** The categories offered to the picker this round: a few at random, same on every render. */
export const CATEGORY_CHOICES = 4

export function categoryChoices(pub: Pub): Category[] {
  const rng = seededRng(pub.createdAt + pub.round * 7919)
  const lastCategory = pub.last?.category
  const pool = CATEGORIES.filter((c) => c.id !== lastCategory)
  return shuffle(pool, rng).slice(0, CATEGORY_CHOICES)
}

export function seededRng(seed: number): Rng {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
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
  const impostors = shuffle(order, rng).slice(0, impostorCount(order.length, rng))
  const starter = pickOne(order, rng)
  const tickets: Record<string, Ticket> = {}
  for (const uid of order) {
    tickets[uid] = {
      round: pub.round,
      category: category.id,
      word: impostors.includes(uid) ? null : word,
    }
  }
  const decoys = shuffle(
    category.words.filter((w) => w !== word),
    rng,
  ).slice(0, 5)
  const secret: Secret = {
    round: pub.round,
    impostors,
    word,
    category: category.id,
    options: shuffle([word, ...decoys], rng),
  }
  return { tickets, secret, starter, word }
}

export function allVoted(pub: Pub): boolean {
  const votes = pub.votes ?? {}
  return playerOrder(pub).every((uid) => votes[uid])
}

export function votesAgainst(pub: Pub, target: string): number {
  return Object.entries(pub.votes ?? {}).filter(([voter, t]) => voter !== target && t === target).length
}

export function isCaught(pub: Pub, impostor: string): boolean {
  return votesAgainst(pub, impostor) >= catchThreshold(playerOrder(pub).length)
}

export function caughtImpostors(pub: Pub, secret: Secret): string[] {
  return secret.impostors.filter((uid) => isCaught(pub, uid))
}

/** True once every caught impostor has made their guess. */
export function allGuessed(pub: Pub, secret: Secret): boolean {
  const guesses = pub.guesses ?? {}
  return caughtImpostors(pub, secret).every((uid) => guesses[uid])
}

/**
 * Scoring:
 *  - you voted for an impostor: +1 for you
 *  - you voted for someone who knew the word: +1 for every impostor
 *  - caught impostor who guesses the word: +2 for that impostor
 * Impostors' own votes score nothing.
 */
export function scoreRound(pub: Pub, secret: Secret): RoundResult {
  const order = playerOrder(pub)
  const votes = pub.votes ?? {}
  const gains: RoundResult['gains'] = {}
  for (const uid of order) gains[uid] = { points: 0, reasons: [] }
  const give = (uid: string, points: number, reason: string) => {
    if (!gains[uid]) return
    gains[uid].points += points
    gains[uid].reasons!.push(reason)
  }

  const imps = secret.impostors
  let fooled = 0
  for (const voter of order) {
    if (imps.includes(voter)) continue
    const target = votes[voter]
    if (!target) continue
    if (imps.includes(target)) give(voter, 1, 'Pogodio uljeza')
    else fooled++
  }
  if (fooled) for (const imp of imps) give(imp, fooled, fooled === 1 ? 'Prevario 1 igrača' : `Prevario ${fooled} igrača`)

  const caught = caughtImpostors(pub, secret)
  const guessedRight = caught.filter((uid) => pub.guesses?.[uid] === secret.word)
  for (const uid of guessedRight) give(uid, 2, 'Pogodio reč')

  return {
    round: secret.round,
    impostors: imps,
    word: secret.word,
    category: secret.category,
    caught,
    guessedRight,
    gains,
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
    guesses: undefined,
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
