import { asList, playerOrder, shuffle, type Rng } from '../game/util'
import type { Pub } from '../game/types'
import type { TihaCard, TihaMark, TihaPlay, TihaState, TihaSuit, TihaTask } from './types'

/** Exactly two players: one team against the mission. */
export const TIHA_PLAYERS = 2
export const COLORS: TihaSuit[] = ['r', 'g', 'b', 'y']
export const COLOR_MAX = 7
export const TRUMPS = 3
export const HAND_SIZE = 12
export const START_LIVES = 3

/** 4 colours x 1-7 plus 3 trumps. */
export const DECK: TihaCard[] = [
  ...COLORS.flatMap((s) => Array.from({ length: COLOR_MAX }, (_, i) => `${s}${i + 1}`)),
  ...Array.from({ length: TRUMPS }, (_, i) => `a${i + 1}`),
]

const SUIT_ORDER: TihaSuit[] = [...COLORS, 'a']

export function tihaOf(pub: Pub): TihaState {
  return pub.tiha ?? {}
}

/** The two players, in join order. */
export function pair(pub: Pub): string[] {
  return playerOrder(pub).slice(0, TIHA_PLAYERS)
}

export function partnerOf(pub: Pub, uid: string): string | undefined {
  const two = pair(pub)
  return two.includes(uid) ? two.find((u) => u !== uid) : undefined
}

export function suitOf(card: TihaCard): TihaSuit {
  return card[0] as TihaSuit
}

export function rankOf(card: TihaCard): number {
  return Number(card.slice(1))
}

/** The player's cards still in hand, sorted by colour then rank. */
export function handOf(pub: Pub, uid: string): TihaCard[] {
  return asList<TihaCard>(tihaOf(pub).hands?.[uid]).sort(
    (a, b) => SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b)) || rankOf(a) - rankOf(b),
  )
}

export function tasksOf(pub: Pub): TihaTask[] {
  return asList<TihaTask>(tihaOf(pub).tasks)
}

export function tableOf(pub: Pub): TihaPlay[] {
  return asList<TihaPlay>(tihaOf(pub).table)
}

/** Cards the player may play now: none unless it is their turn; the led colour if they hold it. */
export function playable(pub: Pub, uid: string): TihaCard[] {
  const t = tihaOf(pub)
  if (pub.phase !== 'play' || t.turn !== uid) return []
  const hand = handOf(pub, uid)
  const lead = tableOf(pub)[0]
  if (!lead) return hand
  const follow = hand.filter((c) => suitOf(c) === suitOf(lead.card))
  return follow.length ? follow : hand
}

/** Highest trump wins, else the highest card of the led colour. Two cards, lead first. */
export function trickWinner(cards: TihaPlay[]): string {
  const trumps = cards.filter((p) => suitOf(p.card) === 'a')
  const pool = trumps.length ? trumps : cards.filter((p) => suitOf(p.card) === suitOf(cards[0].card))
  return pool.reduce((best, p) => (rankOf(p.card) > rankOf(best.card) ? p : best)).uid
}

/** Marks that are true for this card in the player's hand right now. */
export function marksFor(pub: Pub, uid: string, card: TihaCard): TihaMark[] {
  if (tihaOf(pub).signals?.[uid]) return []
  const hand = handOf(pub, uid)
  if (!hand.includes(card) || suitOf(card) === 'a') return []
  const ranks = hand.filter((c) => suitOf(c) === suitOf(card)).map(rankOf)
  if (ranks.length === 1) return ['only']
  const marks: TihaMark[] = []
  if (rankOf(card) === Math.max(...ranks)) marks.push('high')
  if (rankOf(card) === Math.min(...ranks)) marks.push('low')
  return marks
}

/** Win tasks by level; cap of 5 from level 10. */
function winCount(level: number): number {
  return level <= 2 ? level : level <= 3 ? 2 : level <= 6 ? 3 : level < 10 ? 4 : 5
}

/** Builds a mission's tasks for a level from cards actually dealt to the two hands. */
export function generateTasks(level: number, hands: Record<string, TihaCard[]>, rng: Rng): TihaTask[] {
  const lv = Math.max(1, Math.floor(level))
  const pool = [
    ...new Set(
      Object.values(hands)
        .flatMap((h) => asList<TihaCard>(h))
        .filter((c) => suitOf(c) !== 'a'),
    ),
  ].sort()
  const wins = shuffle(pool, rng).slice(0, winCount(lv))
  const tasks: Omit<TihaTask, 'id'>[] = wins.map((card) => ({ kind: 'win', card }))
  if ((lv === 3 || lv >= 6) && wins.length >= 2)
    tasks[Math.floor(rng() * wins.length)].order = rng() < 0.5 ? 'first' : 'last'
  const extra = lv === 5 ? 'count' : lv === 6 ? 'last' : lv >= 7 ? (rng() < 0.5 ? 'count' : 'last') : undefined
  if (extra === 'count') tasks.push({ kind: 'count', n: 2 + Math.floor(rng() * 4) })
  if (extra === 'last') tasks.push({ kind: 'last' })
  return shuffle(tasks, rng).map((t, id) => ({ id, ...t }))
}

function deal(pub: Pub, tiha: TihaState, captain: string, rng: Rng): Pub {
  const two = pair(pub)
  const cards = shuffle(DECK, rng)
  const hands: Record<string, TihaCard[]> = {}
  two.forEach((uid, i) => (hands[uid] = cards.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE)))
  const hidden = cards.slice(TIHA_PLAYERS * HAND_SIZE)
  return {
    ...pub,
    phase: 'draft',
    tiha: {
      level: tiha.level,
      lives: tiha.lives,
      cleared: tiha.cleared,
      captain,
      hands,
      hidden,
      tasks: generateTasks(tiha.level ?? 1, hands, rng),
      turn: captain,
      table: [],
      lastTrick: undefined,
      won: Object.fromEntries(two.map((uid) => [uid, 0])),
      tricks: 0,
      signals: {},
      outcome: undefined,
      failedTask: undefined,
    },
  }
}

/** A new run from the lobby or after a finished one. Needs exactly two players. */
export function startTiha(pub: Pub, rng: Rng): Pub | undefined {
  if (pub.phase !== 'lobby' && pub.phase !== 'over') return undefined
  const two = playerOrder(pub)
  if (two.length !== TIHA_PLAYERS) return undefined
  return deal({ ...pub, round: 1 }, { level: 1, lives: START_LIVES, cleared: 0 }, two[0], rng)
}

/** Takes an unowned task on your turn; the last pick starts the tricks. */
export function takeTask(pub: Pub, uid: string, taskId: number): Pub | undefined {
  const t = tihaOf(pub)
  if (pub.phase !== 'draft' || t.turn !== uid) return undefined
  const tasks = tasksOf(pub)
  const task = tasks.find((x) => x.id === taskId)
  if (!task || task.owner) return undefined
  const next = tasks.map((x) => (x.id === taskId ? { ...x, owner: uid } : x))
  const done = next.every((x) => x.owner)
  return {
    ...pub,
    phase: done ? 'play' : 'draft',
    tiha: { ...t, tasks: next, turn: done ? t.captain : partnerOf(pub, uid) },
  }
}

/** Reveals a card with a true mark. One per player per mission; the turn does not change. */
export function signal(pub: Pub, uid: string, card: TihaCard, mark: TihaMark): Pub | undefined {
  const t = tihaOf(pub)
  if (pub.phase !== 'play' || t.turn !== uid) return undefined
  if (!marksFor(pub, uid, card).includes(mark)) return undefined
  return { ...pub, tiha: { ...t, signals: { ...(t.signals ?? {}), [uid]: { card, mark } } } }
}

/** Updates task states after a finished trick. `won` and `tricks` already include it. */
function resolveTasks(
  tasks: TihaTask[],
  trick: TihaPlay[],
  winner: string,
  won: Record<string, number>,
  tricks: number,
): TihaTask[] {
  const inTrick = (t: TihaTask) => trick.some((p) => p.card === t.card)
  const doneBefore = tasks.filter((t) => t.kind === 'win' && t.state === 'done')
  let next = tasks.map((t): TihaTask => {
    if (t.state || t.kind !== 'win' || !inTrick(t)) return t
    const hit = t.owner === winner
    // 'first' fails when another win task was fulfilled in an earlier trick
    const early = t.order === 'first' && doneBefore.some((d) => d.id !== t.id)
    return { ...t, state: hit && !early ? 'done' : 'failed' }
  })
  const fresh = new Set(tasks.filter((t) => !t.state).map((t) => t.id))
  next = next.map((t) => {
    if (!fresh.has(t.id) || t.kind !== 'win') return t
    const others = next.filter((o) => o.kind === 'win' && o.id !== t.id)
    // 'last' fails when fulfilled while another win task is still open
    if (t.order === 'last' && t.state === 'done' && others.some((o) => o.state !== 'done')) return { ...t, state: 'failed' }
    // 'first' fails once another win task is fulfilled before its own card is won
    if (t.order === 'first' && !t.state && others.some((o) => o.state === 'done')) return { ...t, state: 'failed' }
    return t
  })
  const last = tricks >= HAND_SIZE
  return next.map((t): TihaTask => {
    if (t.state) return t
    const mine = t.owner ? (won[t.owner] ?? 0) : 0
    if (t.kind === 'count') {
      const n = t.n ?? 0
      if (mine > n || mine + (HAND_SIZE - tricks) < n) return { ...t, state: 'failed' }
      return last ? { ...t, state: 'done' } : t
    }
    if (t.kind === 'last' && last) return { ...t, state: t.owner === winner ? 'done' : 'failed' }
    // nothing can resolve a task once every card is played
    return last ? { ...t, state: 'failed' } : t
  })
}

/** Plays a card. The second card of a trick resolves it, the tasks and the end of the mission. */
export function playCard(pub: Pub, uid: string, card: TihaCard): Pub | undefined {
  const t = tihaOf(pub)
  if (!playable(pub, uid).includes(card)) return undefined
  const partner = partnerOf(pub, uid)
  if (!partner) return undefined
  const table = tableOf(pub)
  const play: TihaPlay = { uid, card }
  if (!table.length) return { ...pub, tiha: { ...t, table: [play], turn: partner } }

  const cards = [...table, play]
  const winner = trickWinner(cards)
  const won = { ...(t.won ?? {}), [winner]: (t.won?.[winner] ?? 0) + 1 }
  const tricks = (t.tricks ?? 0) + 1
  const hands: Record<string, TihaCard[]> = {}
  for (const p of pair(pub)) hands[p] = handOf(pub, p).filter((c) => !cards.some((x) => x.uid === p && x.card === c))
  const tasks = resolveTasks(tasksOf(pub), cards, winner, won, tricks)
  const failed = tasks.find((x) => x.state === 'failed')
  const cleared = tasks.every((x) => x.state === 'done')
  const base: TihaState = { ...t, hands, table: [], lastTrick: { cards, winner }, won, tricks, tasks }
  if (!failed && !cleared) return { ...pub, tiha: { ...base, turn: winner } }
  return {
    ...pub,
    phase: 'result',
    tiha: failed
      ? { ...base, turn: undefined, outcome: 'lost', failedTask: failed.id, lives: Math.max(0, (t.lives ?? 0) - 1) }
      : { ...base, turn: undefined, outcome: 'won', cleared: (t.cleared ?? 0) + 1 },
  }
}

/** After a result: the next mission, or the end of the run when no lives are left. */
export function nextTiha(pub: Pub, rng: Rng): Pub | undefined {
  if (pub.phase !== 'result') return undefined
  const t = tihaOf(pub)
  if ((t.lives ?? 0) <= 0) return { ...pub, phase: 'over' }
  const level = (t.level ?? 1) + (t.outcome === 'won' ? 1 : 0)
  const captain = (t.captain && partnerOf(pub, t.captain)) || pair(pub)[0]
  return deal({ ...pub, round: pub.round + 1 }, { ...t, level }, captain, rng)
}

export function resetTihaLobby(pub: Pub): Pub {
  return { ...pub, phase: 'lobby', round: 0, tiha: undefined }
}
