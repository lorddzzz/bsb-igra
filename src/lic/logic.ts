import { asList, playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { LicDuel, LicState } from './types'

/** Exactly two players: you against your friend. */
export const LIC_PLAYERS = 2
/** Prize tickets: +1 to +10 and three penalties. */
export const TICKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1, -2, -3]
/** Each player's bidding cards, 1 to 13, one per round. */
export const HAND = Array.from({ length: TICKETS.length }, (_, i) => i + 1)
export const ROUNDS = TICKETS.length
/** Best of three. */
export const WINS_NEEDED = 2

export function licOf(pub: Pub): LicState {
  return pub.lic ?? {}
}

/** The two players, in join order. */
export function duelists(pub: Pub): string[] {
  return playerOrder(pub).slice(0, LIC_PLAYERS)
}

export function opponentOf(pub: Pub, uid: string): string | undefined {
  return duelists(pub).find((u) => u !== uid)
}

export function playedBy(pub: Pub, uid: string): number[] {
  return asList<number>(licOf(pub).played?.[uid])
}

/** Cards this player can still bid with. */
export function handOf(pub: Pub, uid: string): number[] {
  const played = playedBy(pub, uid)
  return HAND.filter((c) => !played.includes(c))
}

/** Tickets on the table this round: whatever ties left behind plus this round's ticket. */
export function potOf(pub: Pub): number[] {
  const { deck, carry } = licOf(pub)
  const ticket = asList<number>(deck)[pub.round - 1]
  return [...asList<number>(carry), ...(ticket === undefined ? [] : [ticket])]
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Tickets that have not come up yet this game. */
export function upcoming(pub: Pub): number[] {
  return asList<number>(licOf(pub).deck).slice(pub.round)
}

export function wins(pub: Pub, uid: string): number {
  return licOf(pub).wins?.[uid] ?? 0
}

/**
 * Who takes the pot: the higher bid when it is worth something, the lower bid when it is a penalty.
 * Equal bids take nothing.
 */
export function takerOf(bids: Record<string, number>, potValue: number): string | undefined {
  const [[a, x], [b, y]] = Object.entries(bids)
  if (x === y) return undefined
  const high = x > y ? a : b
  const low = x > y ? b : a
  return potValue < 0 ? low : high
}

function deal(rng: Rng): number[] {
  return shuffle(TICKETS, rng)
}

function freshGame(pub: Pub, lic: LicState, rng: Rng): Pub {
  const order = duelists(pub)
  return {
    ...pub,
    phase: 'bid',
    round: 1,
    scores: Object.fromEntries(order.map((uid) => [uid, 0])),
    lic: { set: lic.set, wins: lic.wins, deck: deal(rng) },
  }
}

export function startLic(pub: Pub, rng: Rng): Pub {
  return freshGame(pub, { set: 1, wins: Object.fromEntries(duelists(pub).map((uid) => [uid, 0])) }, rng)
}

/**
 * Places a bid. Once both are in, the round is revealed in the same step.
 * Returns undefined when the bid is not allowed (wrong phase, card already used, already bid).
 */
export function placeBid(pub: Pub, uid: string, card: number): Pub | undefined {
  const lic = licOf(pub)
  if (pub.phase !== 'bid' || !duelists(pub).includes(uid)) return undefined
  if (lic.bids?.[uid] !== undefined || !handOf(pub, uid).includes(card)) return undefined
  const next: Pub = { ...pub, lic: { ...lic, bids: { ...(lic.bids ?? {}), [uid]: card } } }
  return allBid(next) ? reveal(next) : next
}

export function allBid(pub: Pub): boolean {
  const bids = licOf(pub).bids ?? {}
  return duelists(pub).every((uid) => typeof bids[uid] === 'number')
}

/** Shows both bids, hands out the pot (or leaves it on the table) and uses up the two cards. */
export function reveal(pub: Pub): Pub {
  const lic = licOf(pub)
  const bids = lic.bids ?? {}
  const pot = potOf(pub)
  const value = sum(pot)
  const taker = takerOf(bids, value)
  const scores = { ...(pub.scores ?? {}) }
  if (taker) scores[taker] = (scores[taker] ?? 0) + value
  const played: Record<string, number[]> = {}
  for (const uid of duelists(pub)) played[uid] = [...playedBy(pub, uid), bids[uid]]
  const duel: LicDuel = { round: pub.round, bids, pot, ...(taker ? { taker } : {}) }
  return {
    ...pub,
    phase: 'duel',
    scores,
    lic: { ...lic, bids: undefined, played, duel, carry: taker ? undefined : pot },
  }
}

/** After a reveal: the next round, or the end of this game. */
export function nextLic(pub: Pub): Pub {
  if (pub.round < ROUNDS) return { ...pub, phase: 'bid', round: pub.round + 1 }
  // A tie in the very last round leaves its tickets to nobody.
  const lic = { ...licOf(pub), carry: undefined }
  const [a, b] = duelists(pub)
  const sa = pub.scores?.[a] ?? 0
  const sb = pub.scores?.[b] ?? 0
  const setWinner = sa === sb ? undefined : sa > sb ? a : b
  const winsNow = { ...(lic.wins ?? {}) }
  if (setWinner) winsNow[setWinner] = (winsNow[setWinner] ?? 0) + 1
  const done = Boolean(setWinner && winsNow[setWinner] >= WINS_NEEDED)
  return { ...pub, phase: done ? 'over' : 'set', lic: { ...lic, wins: winsNow, setWinner } }
}

/** The next game of the match. A drawn game does not count, so the set number stays. */
export function nextSet(pub: Pub, rng: Rng): Pub {
  const lic = licOf(pub)
  const set = (lic.set ?? 1) + (lic.setWinner ? 1 : 0)
  return freshGame(pub, { set, wins: lic.wins }, rng)
}

/** The match winner, once someone has enough games. */
export function matchWinner(pub: Pub): string | undefined {
  return duelists(pub).find((uid) => wins(pub, uid) >= WINS_NEEDED)
}

export function resetLicLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, scores: undefined, lic: undefined }
}
