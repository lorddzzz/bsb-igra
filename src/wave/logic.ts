import { WAVE_SCALES } from '../data/waveScales'
import { asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { WaveResult, WaveState } from './types'

/** How many times each player gives the clue in one game. */
export const TURNS_EACH = 2
export const MAX_CLUE_LENGTH = 40
/** Scoring rings around the target: distance (on 0..100) and points, bullseye first. */
export const RINGS: { within: number; points: number }[] = [
  { within: 4, points: 4 },
  { within: 10, points: 3 },
  { within: 16, points: 2 },
]
/** Targets stay a little away from the very ends, where a ring would be cut in half. */
const TARGET_MIN = 6
const TARGET_MAX = 94

export function waveOf(pub: Pub): WaveState {
  return pub.wave ?? {}
}

export function pointsFor(guess: number, target: number): number {
  const d = Math.abs(guess - target)
  return RINGS.find((r) => d <= r.within)?.points ?? 0
}

/** Who gives the clue this round: a random player first, then everyone in join order. */
export function clueGiver(pub: Pub): string {
  const order = playerOrder(pub)
  return order[(Math.max(pub.round, 1) - 1 + (waveOf(pub).offset ?? 0)) % order.length]
}

export function totalRounds(pub: Pub): number {
  return waveOf(pub).total ?? playerOrder(pub).length * TURNS_EACH
}

export function guessers(pub: Pub): string[] {
  const giver = clueGiver(pub)
  return playerOrder(pub).filter((uid) => uid !== giver)
}

export function allAimed(pub: Pub): boolean {
  const guesses = waveOf(pub).guesses ?? {}
  return guessers(pub).every((uid) => typeof guesses[uid] === 'number')
}

/** Two scales not used in this room yet (or any, once they have all been used), and a random target. */
export function drawRound(wave: WaveState, rng: Rng): WaveState {
  const seen = asList<string>(wave.seen)
  let pool = WAVE_SCALES.filter((s) => !seen.includes(s.id))
  const fresh = pool.length >= 2
  if (!fresh) pool = WAVE_SCALES
  const choices = shuffle(pool, rng)
    .slice(0, 2)
    .map((s) => s.id)
  return {
    total: wave.total,
    offset: wave.offset,
    seen: fresh ? [...seen, ...choices] : choices,
    choices,
    target: TARGET_MIN + Math.floor(rng() * (TARGET_MAX - TARGET_MIN + 1)),
  }
}

/**
 * Scoring:
 *  - each guesser: 4 for a bullseye, 3 or 2 for the rings around it
 *  - the clue giver: as many points as the best guess got
 */
export function scoreWave(pub: Pub): WaveResult {
  const { target = 50, guesses = {} } = waveOf(pub)
  const gains: WaveResult['gains'] = {}
  let best = 0
  for (const uid of playerOrder(pub)) gains[uid] = { points: 0, reasons: [] }
  for (const uid of guessers(pub)) {
    const guess = guesses[uid]
    if (typeof guess !== 'number') continue
    const points = pointsFor(guess, target)
    best = Math.max(best, points)
    if (!points) continue
    gains[uid].points = points
    gains[uid].reasons!.push(points === 4 ? 'Pun pogodak!' : 'Blizu')
  }
  const giver = clueGiver(pub)
  if (best && gains[giver]) {
    gains[giver].points = best
    gains[giver].reasons!.push('Dobar trag')
  }
  return { round: pub.round, gains }
}

export function applyWave(pub: Pub, result: WaveResult): Pub {
  const scores = { ...(pub.scores ?? {}) }
  for (const [uid, g] of Object.entries(result.gains)) scores[uid] = (scores[uid] ?? 0) + g.points
  return { ...pub, scores, phase: 'result', wave: { ...waveOf(pub), result } }
}

export function startWave(pub: Pub, rng: Rng): Pub {
  const order = playerOrder(pub)
  const wave: WaveState = {
    total: order.length * TURNS_EACH,
    offset: Math.floor(rng() * order.length),
    seen: waveOf(pub).seen,
  }
  return {
    ...pub,
    phase: 'clue',
    round: 1,
    scores: Object.fromEntries(order.map((uid) => [uid, 0])),
    wave: drawRound(wave, rng),
  }
}

export function nextWaveRound(pub: Pub, rng: Rng): Pub {
  if (pub.round >= totalRounds(pub)) return { ...pub, phase: 'over' }
  return { ...pub, phase: 'clue', round: pub.round + 1, wave: drawRound(waveOf(pub), rng) }
}

export function resetWaveLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, wave: { seen: waveOf(pub).seen } }
}
