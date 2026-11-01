import { getPrviPrompt, PRVI_PROMPTS, type PrviLevel, type PrviPrompt } from '../data/prviPrompts'
import { addStats, asList, playerOrder, shuffle, type Rng } from '../game/util'
import type { Pub } from '../game/types'
import type { PrviResult, PrviState } from './types'

/** Prompts per game; fixed by design. */
export const ROUNDS = 10
export const DEFAULT_LEVEL: PrviLevel = 'lagano'
export const MAJORITY_POINTS = 1

export function prviOf(pub: Pub): PrviState {
  return pub.prvi ?? {}
}

export function levelOf(pub: Pub): PrviLevel {
  const level = prviOf(pub).level
  return level === 'srednje' || level === 'ljuto' ? level : DEFAULT_LEVEL
}

/** This game's prompts: ones not asked in this room yet first, then repeats only if the level has run out. */
export function drawPrompts(level: PrviLevel, seen: string[], count: number, rng: Rng): string[] {
  const pool: PrviPrompt[] = PRVI_PROMPTS.filter((p) => p.level === level)
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

export function currentPrompt(pub: Pub): PrviPrompt {
  const ids = asList<string>(prviOf(pub).prompts)
  return getPrviPrompt(ids[Math.max(pub.round, 1) - 1] ?? '')
}

export function isFinalRound(pub: Pub): boolean {
  return pub.round >= ROUNDS
}

export function votesOf(pub: Pub): Record<string, string> {
  return prviOf(pub).votes ?? {}
}

/** A vote counts when both the voter and the pick are players in the room. Voting for yourself is allowed. */
export function validVote(pub: Pub, voter: string, target: unknown): target is string {
  const players = playerOrder(pub)
  return typeof target === 'string' && players.includes(voter) && players.includes(target)
}

export function allVoted(pub: Pub): boolean {
  const votes = votesOf(pub)
  return playerOrder(pub).every((uid) => validVote(pub, uid, votes[uid]))
}

/** Votes each player received, from valid votes only. */
export function countVotes(pub: Pub): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [voter, target] of Object.entries(votesOf(pub))) {
    if (!validVote(pub, voter, target)) continue
    counts[target] = (counts[target] ?? 0) + 1
  }
  return counts
}

/** Who voted for this player, in join order. */
export function votersFor(pub: Pub, target: string): string[] {
  const votes = votesOf(pub)
  return playerOrder(pub).filter((uid) => votes[uid] === target)
}

/**
 * Scoring for one prompt:
 *  - the most-voted player(s) take the prompt's title; ties share it
 *  - everyone who voted for a most-voted player gets +1
 *  - when every vote went to a different player, there is no majority: nobody scores, no title
 */
export function scorePrvi(pub: Pub): PrviResult {
  const players = playerOrder(pub)
  const counts = countVotes(pub)
  const most = Math.max(0, ...Object.values(counts))
  const top = most > 1 ? players.filter((uid) => counts[uid] === most) : []
  const votes = votesOf(pub)
  const gains: PrviResult['gains'] = {}
  for (const uid of players) {
    const hit = top.includes(votes[uid])
    gains[uid] = hit ? { points: MAJORITY_POINTS, reasons: ['Uz većinu'] } : { points: 0, reasons: [] }
  }
  return { round: pub.round, counts, top, gains }
}

export function applyPrvi(pub: Pub, result: PrviResult): Pub {
  const state = prviOf(pub)
  const scores = { ...(pub.scores ?? {}) }
  const add: Record<string, Record<string, number>> = {}
  const top = asList<string>(result.top)
  const titles: Record<string, string[]> = {}
  for (const [uid, ids] of Object.entries(state.titles ?? {})) titles[uid] = asList<string>(ids)
  const prompt = currentPrompt(pub).id
  for (const uid of top) titles[uid] = [...(titles[uid] ?? []), prompt]
  for (const [uid, g] of Object.entries(result.gains)) {
    scores[uid] = (scores[uid] ?? 0) + g.points
    add[uid] = { majority: g.points > 0 ? 1 : 0, titles: top.includes(uid) ? 1 : 0 }
  }
  return { ...pub, scores, stats: addStats(pub.stats, add), phase: 'result', prvi: { ...state, result, titles } }
}

/** The titles a player took this game, oldest first. */
export function titlesOf(pub: Pub, uid: string): PrviPrompt[] {
  return asList<string>(prviOf(pub).titles?.[uid]).map(getPrviPrompt)
}

export function startPrvi(pub: Pub, rng: Rng): Pub {
  const seen = asList<string>(prviOf(pub).seen)
  const level = levelOf(pub)
  const prompts = drawPrompts(level, seen, ROUNDS, rng)
  return {
    ...pub,
    phase: 'vote',
    round: 1,
    stats: undefined,
    scores: Object.fromEntries(playerOrder(pub).map((uid) => [uid, 0])),
    prvi: { level, prompts, seen: [...new Set([...seen, ...prompts])] },
  }
}

export function nextPrviRound(pub: Pub): Pub {
  if (isFinalRound(pub)) return { ...pub, phase: 'over' }
  const { prompts, seen, titles } = prviOf(pub)
  return {
    ...pub,
    phase: 'vote',
    round: pub.round + 1,
    prvi: { level: levelOf(pub), prompts: asList<string>(prompts), seen: asList<string>(seen), titles },
  }
}

export function resetPrviLobby(pub: Pub): Pub {
  return {
    ...pub,
    phase: 'lobby',
    round: 0,
    scores: undefined,
    prvi: { level: levelOf(pub), seen: asList<string>(prviOf(pub).seen) },
  }
}
