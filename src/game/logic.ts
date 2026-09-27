import { CATEGORIES, getCategory, type Category } from '../data/words'
import { MODES, type Pub, type RoundResult, type Secret, type Ticket } from './types'

export type Rng = () => number

/**
 * Reads a list that came from the database. Firebase drops empty lists, may hand a list back as an
 * object with numeric keys, and a phone still on an older version may have written another shape.
 */
export function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value.filter((v) => v != null) as T[]
  if (value && typeof value === 'object') return Object.values(value).filter((v) => v != null) as T[]
  return []
}

/** Fixes up the round's answers as read from the database, including ones an older version wrote. */
export function normalizeSecret(raw: unknown): Secret | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Secret & { impostor?: string }
  const impostors = asList<string>(s.impostors)
  if (!impostors.length && typeof s.impostor === 'string') impostors.push(s.impostor)
  return { ...s, impostors, options: asList<string>(s.options) }
}

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

/** Whoever picks the category this round; starts with a random player, then rotates each round. */
export function pickerFor(pub: Pub): string {
  const order = playerOrder(pub)
  return order[(Math.max(pub.round, 1) - 1 + (pub.pickerOffset ?? 0)) % order.length]
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
  // Rooms from before per-game seeds fall back to the room's creation time.
  const rng = seededRng(mixSeed(pub.seed ?? pub.createdAt, pub.round))
  const lastCategory = pub.last?.category
  const pool = CATEGORIES.filter((c) => c.id !== lastCategory)
  return shuffle(pool, rng).slice(0, CATEGORY_CHOICES)
}

/** A random seed for a new game, so replaying in the same room doesn't repeat the categories. */
export function newGameSeed(rng: Rng): number {
  return 1 + Math.floor(rng() * 2147483646)
}

/** Scrambles seed and round together so neighbouring seeds or rounds don't give similar draws. */
export function mixSeed(seed: number, round: number): number {
  let h = (Math.floor(seed) ^ Math.imul(round + 1, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

export function seededRng(seed: number): Rng {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Draw weight by how many rounds in a row a player has just been an impostor. */
export const STREAK_WEIGHTS = [1, 0.7, 0.1]
/** Points for an impostor who was not caught. */
export const ESCAPE_BONUS = 2

/**
 * Picks the impostors at random, but someone who was an impostor the last round is a bit less likely,
 * and the last two rounds much less likely, so three in a row is rare yet never impossible.
 */
export function drawImpostors(order: string[], count: number, streak: Record<string, number>, rng: Rng): string[] {
  const pool = [...order]
  const picked: string[] = []
  while (picked.length < count && pool.length) {
    const weights = pool.map((uid) => STREAK_WEIGHTS[Math.min(streak[uid] ?? 0, STREAK_WEIGHTS.length - 1)])
    let r = rng() * weights.reduce((a, b) => a + b, 0)
    let i = 0
    while (i < pool.length - 1 && r >= weights[i]) r -= weights[i++]
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
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
  const used = new Set(asList<string>(pub.usedWords))
  const fresh = category.words.filter((w) => !used.has(w))
  const word = pickOne(fresh.length ? fresh : category.words, rng)
  const impostors = drawImpostors(order, impostorCount(order.length, rng), pub.impostorStreak ?? {}, rng)
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
  const locked = pub.locked ?? {}
  return playerOrder(pub).every((uid) => locked[uid])
}

/** Who this player voted for. Also reads the single-vote shape the earlier version wrote. */
export function votesOf(pub: Pub, voter: string): string[] {
  const v = pub.votes?.[voter]
  if (typeof v === 'string') return [v]
  if (!v || typeof v !== 'object') return []
  return Object.keys(v).filter((t) => v[t] && t !== voter)
}

export function votesAgainst(pub: Pub, target: string): number {
  return playerOrder(pub).filter((voter) => voter !== target && votesOf(pub, voter).includes(target)).length
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
 *  - each of your (up to 2) votes that lands on an impostor: +1 for you
 *  - each vote for someone who knew the word: +1 for every impostor
 *  - impostor who is not caught: +2
 *  - caught impostor who guesses the word: +2 for that impostor
 * Impostors' own votes score nothing.
 */
export function scoreRound(pub: Pub, secret: Secret): RoundResult {
  const order = playerOrder(pub)
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
    const targets = votesOf(pub, voter)
    const right = targets.filter((t) => imps.includes(t)).length
    if (right) give(voter, right, right === 1 ? 'Pogodio uljeza' : 'Pogodio oba uljeza')
    fooled += targets.length - right
  }
  if (fooled) for (const imp of imps) give(imp, fooled, fooled === 1 ? 'Prevario 1 igrača' : `Prevario ${fooled} igrača`)

  const caught = caughtImpostors(pub, secret)
  for (const imp of imps) if (!caught.includes(imp)) give(imp, ESCAPE_BONUS, 'Nije uhvaćen')
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
  const impostors = asList<string>(result.impostors)
  const impostorStreak = Object.fromEntries(
    playerOrder(pub).map((uid) => [uid, impostors.includes(uid) ? (pub.impostorStreak?.[uid] ?? 0) + 1 : 0]),
  )
  return {
    ...pub,
    scores,
    impostorStreak,
    last: result,
    usedWords: [...asList<string>(pub.usedWords), result.word],
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
    locked: undefined,
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
    impostorStreak: undefined,
  }
}

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPRSTUVZ'

export function makeRoomCode(rng: Rng): string {
  return Array.from({ length: 4 }, () => pickOne([...ROOM_ALPHABET], rng)).join('')
}

export { CATEGORIES }
