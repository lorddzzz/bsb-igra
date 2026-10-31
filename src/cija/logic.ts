import { CIJA_PROMPTS, getCijaPrompt, type CijaLevel, type CijaPrompt } from '../data/cijaPrompts'
import { addStats, asList, playerOrder, shuffle, type Rng } from '../game/util'
import type { Pub } from '../game/types'
import type { CijaResult, CijaState } from './types'

export const MIN_ROUNDS = 2
export const MAX_ROUNDS = 5
export const DEFAULT_ROUNDS = 3
export const DEFAULT_LEVEL: CijaLevel = 'lagano'
export const MAX_ANSWER_LENGTH = 60
export const RIGHT_POINTS = 1
export const FOOL_POINTS = 1

export function cijaOf(pub: Pub): CijaState {
  return pub.cija ?? {}
}

export function levelOf(pub: Pub): CijaLevel {
  const level = cijaOf(pub).level
  return level === 'srednje' || level === 'ljuto' ? level : DEFAULT_LEVEL
}

/** Prompts in this game, always within MIN_ROUNDS..MAX_ROUNDS. */
export function roundsOf(pub: Pub): number {
  const n = Math.round(Number(cijaOf(pub).rounds))
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, n)) : DEFAULT_ROUNDS
}

export function clampRounds(n: number): number {
  return Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(n)))
}

/** This game's prompts: ones not asked in this room yet first, then repeats only if the level has run out. */
export function drawPrompts(level: CijaLevel, seen: string[], count: number, rng: Rng): string[] {
  const pool: CijaPrompt[] = CIJA_PROMPTS.filter((p) => p.level === level)
  const done = new Set(seen)
  const fresh = shuffle(
    pool.filter((p) => !done.has(p.id)),
    rng,
  )
  const stale = shuffle(
    pool.filter((p) => done.has(p.id)),
    rng,
  )
  return [...fresh, ...stale].slice(0, count).map((p) => p.id)
}

export function currentPrompt(pub: Pub): CijaPrompt {
  const ids = asList<string>(cijaOf(pub).prompts)
  return getCijaPrompt(ids[Math.max(pub.round, 1) - 1] ?? '')
}

export function isFinalRound(pub: Pub): boolean {
  return pub.round >= roundsOf(pub)
}

/** What a player typed, tidied up; empty if there is nothing to send. */
export function cleanAnswer(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER_LENGTH).trim()
}

export function allAnswered(pub: Pub): boolean {
  const answers = cijaOf(pub).answers ?? {}
  return playerOrder(pub).every((uid) => Boolean(answers[uid]?.trim()))
}

/** Lowercase, no Serbian diacritics, no punctuation, single spaces: "Pica!" and "pica" are the same answer. */
function sameKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function answersOf(pub: Pub): Record<string, string> {
  return cijaOf(pub).answers ?? {}
}

/** Whose answers are on the board, in the order they are shown. */
export function orderOf(pub: Pub): string[] {
  return asList<string>(cijaOf(pub).order)
}

/**
 * Everyone has answered: shuffle the answers onto the board. Two answers that read the same get a
 * number added to the later one, so players can tell them apart.
 */
export function closeAnswers(pub: Pub, rng: Rng): Pub {
  const players = playerOrder(pub)
  const answers: Record<string, string> = {}
  const count = new Map<string, number>()
  for (const uid of players) {
    const text = cleanAnswer(cijaOf(pub).answers?.[uid] ?? '')
    const key = sameKey(text) || text
    const n = (count.get(key) ?? 0) + 1
    count.set(key, n)
    answers[uid] = n > 1 ? `${text} (${n})` : text
  }
  return { ...pub, phase: 'match', cija: { ...cijaOf(pub), answers, order: shuffle(players, rng) } }
}

/**
 * A complete, fair set of guesses: every answer but your own is matched to a different friend, and no
 * friend is used twice. That makes it a true matching, so the last one is always forced.
 */
export function validMatching(pub: Pub, uid: string, guess: unknown): guess is Record<string, string> {
  if (!guess || typeof guess !== 'object') return false
  const players = playerOrder(pub)
  if (!players.includes(uid)) return false
  const owners = orderOf(pub).filter((o) => o !== uid)
  const entries = Object.entries(guess as Record<string, unknown>)
  if (entries.length !== owners.length || owners.length !== players.length - 1) return false
  const names = new Set<string>()
  for (const owner of owners) {
    const who = (guess as Record<string, unknown>)[owner]
    if (typeof who !== 'string' || who === uid || !players.includes(who) || names.has(who)) return false
    names.add(who)
  }
  return true
}

export function allMatched(pub: Pub): boolean {
  const guesses = cijaOf(pub).guesses ?? {}
  return playerOrder(pub).every((uid) => validMatching(pub, uid, guesses[uid]))
}

/** The most points one answer can earn its author for fooling people: half of the guessers. */
export function foolCap(playerCount: number): number {
  return Math.floor((playerCount - 1) / 2)
}

/** Who got an answer right and who got it wrong. */
export function guessersOf(pub: Pub, owner: string): { right: string[]; wrong: string[] } {
  const guesses = cijaOf(pub).guesses ?? {}
  const right: string[] = []
  const wrong: string[] = []
  for (const uid of playerOrder(pub)) {
    if (uid === owner) continue
    if (guesses[uid]?.[owner] === owner) right.push(uid)
    else wrong.push(uid)
  }
  return { right, wrong }
}

/**
 * Scoring for one prompt:
 *  - each answer you match to the right friend: +1
 *  - each friend who gets your answer wrong: +1, but at most half of the guessers (rounded down),
 *    so an answer nobody could guess cannot win the game on its own
 */
export function scoreCija(pub: Pub): CijaResult {
  const players = playerOrder(pub)
  const cap = foolCap(players.length)
  const gains: CijaResult['gains'] = {}
  for (const uid of players) gains[uid] = { points: 0, reasons: [], right: 0, fooled: 0 }

  for (const owner of orderOf(pub)) {
    if (!gains[owner]) continue
    const { right, wrong } = guessersOf(pub, owner)
    for (const uid of right) {
      gains[uid].right! += 1
      gains[uid].points += RIGHT_POINTS
    }
    const fooled = Math.min(wrong.length, cap)
    gains[owner].fooled = fooled
    gains[owner].points += fooled * FOOL_POINTS
  }
  for (const uid of players) {
    const g = gains[uid]
    if (g.right) g.reasons!.push(`Pogođeno ${g.right}`)
    if (g.fooled) g.reasons!.push(`Prevareno ${g.fooled}`)
  }
  return { round: pub.round, gains }
}

export function applyCija(pub: Pub, result: CijaResult): Pub {
  const scores = { ...(pub.scores ?? {}) }
  const add: Record<string, Record<string, number>> = {}
  for (const [uid, g] of Object.entries(result.gains)) {
    scores[uid] = (scores[uid] ?? 0) + g.points
    add[uid] = { guessed: g.right ?? 0, fooled: g.fooled ?? 0 }
  }
  return { ...pub, scores, stats: addStats(pub.stats, add), phase: 'result', cija: { ...cijaOf(pub), result } }
}

export function startCija(pub: Pub, rng: Rng): Pub {
  const { seen: before } = cijaOf(pub)
  const seen = asList<string>(before)
  const level = levelOf(pub)
  const rounds = roundsOf(pub)
  const prompts = drawPrompts(level, seen, rounds, rng)
  return {
    ...pub,
    phase: 'write',
    round: 1,
    stats: undefined,
    scores: Object.fromEntries(playerOrder(pub).map((uid) => [uid, 0])),
    cija: { level, rounds, prompts, seen: [...new Set([...seen, ...prompts])] },
  }
}

export function nextCijaRound(pub: Pub): Pub {
  if (isFinalRound(pub)) return { ...pub, phase: 'over' }
  const { prompts, seen } = cijaOf(pub)
  return {
    ...pub,
    phase: 'write',
    round: pub.round + 1,
    cija: { level: levelOf(pub), rounds: roundsOf(pub), prompts: asList<string>(prompts), seen: asList<string>(seen) },
  }
}

export function resetCijaLobby(pub: Pub): Pub {
  return {
    ...pub,
    phase: 'lobby',
    round: 0,
    scores: undefined,
    cija: { level: levelOf(pub), rounds: roundsOf(pub), seen: asList<string>(cijaOf(pub).seen) },
  }
}
