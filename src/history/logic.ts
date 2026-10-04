import { asList, playerOrder } from '../game/logic'
import type { GameId, Pub } from '../game/types'
import { matchWinner, wins as licWins } from '../lic/logic'
import { misijaOf, sideOf } from '../misija/logic'
import type { Role } from '../misija/types'
import type { HistoryGame, HistoryPlayer } from './types'

/** Games with a points table at the end; Licitacija counts won games, Misija only sides. */
export const SCORED: GameId[] = ['uljez', 'blef', 'talas', 'kviz']

/**
 * The all-time key for a typed name: case, spaces and accents don't matter, so Dule, dule and Dulé
 * are one person. Đ has no accent to strip, so it counts as dj.
 */
export function nameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

function trimStats(stats: Record<string, number> | undefined): Record<string, number> | undefined {
  const kept = Object.entries(stats ?? {}).filter(([, n]) => n)
  return kept.length ? Object.fromEntries(kept) : undefined
}

/**
 * The record of a game that just ended, or null while it hasn't. Misija needs everyone's roles,
 * which only the secret part of the room holds.
 */
export function summarize(pub: Pub, code: string, roles?: Record<string, Role>): Omit<HistoryGame, 'at'> | null {
  if (pub.phase !== 'over') return null
  const game = pub.game ?? 'uljez'
  const order = playerOrder(pub)
  if (order.length < 2) return null
  const base = (uid: string): HistoryPlayer => ({
    name: pub.players?.[uid]?.name ?? '?',
    badge: pub.players?.[uid]?.badge,
  })

  let players: HistoryPlayer[]
  if (game === 'misija') {
    const winner = misijaOf(pub).winner
    if (!winner || !roles || order.some((uid) => !roles[uid])) return null
    players = order.map((uid) => {
      const side = sideOf(roles[uid])
      const won = side === winner
      return { ...base(uid), side, won, stats: side === 'spijuni' ? { spy: 1, ...(won ? { spyWin: 1 } : {}) } : undefined }
    })
  } else if (game === 'licitacija') {
    const champ = matchWinner(pub)
    if (!champ) return null
    players = order.map((uid) => ({ ...base(uid), won: uid === champ, stats: trimStats({ sets: licWins(pub, uid) }) }))
  } else {
    const top = Math.max(...order.map((uid) => pub.scores?.[uid] ?? 0))
    players = order.map((uid) => {
      const points = pub.scores?.[uid] ?? 0
      return { ...base(uid), points, won: top > 0 && points === top, stats: trimStats(pub.stats?.[uid]) }
    })
  }
  return { game, room: code, players: players.map((p) => JSON.parse(JSON.stringify(p))) }
}

/** JSON with sorted keys, so every phone gets the same text for the same data. */
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  const keys = Object.keys(value as object).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`
}

/** A short hash (cyrb53). */
function hash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * Where a finished game is saved. Every phone in the room works out the same id from the final
 * state, so the game is saved once however many phones try. The random parts each game draws at
 * the start (seed, question order, deck...) keep two games in one room apart.
 */
export function recordId(pub: Pub, record: Omit<HistoryGame, 'at'>): string {
  const nonce = {
    createdAt: pub.createdAt,
    round: pub.round,
    seed: pub.seed,
    words: pub.usedWords,
    blef: pub.blef?.questions,
    wave: [pub.wave?.offset, pub.wave?.seen],
    kviz: pub.kviz?.game,
    lic: [pub.lic?.deck, pub.lic?.set],
    misija: [pub.misija?.game, pub.misija?.tally],
  }
  return `${record.room}-${hash(stable({ record, nonce }))}`
}

export interface GameTotals {
  games: number
  wins: number
  points: number
}

export interface PlayerTotals extends GameTotals {
  key: string
  /** The latest spelling and badge this person used. */
  name: string
  badge?: string
  byGame: Partial<Record<GameId, GameTotals>>
  /** Summed stats, keyed `${game}.${stat}`. */
  stats: Record<string, number>
}

/** Saved games, oldest first, with anything malformed dropped. */
export function gamesOf(raw: unknown): HistoryGame[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.values(raw as Record<string, HistoryGame>)
    .filter((g) => g && typeof g === 'object' && g.game && asList(g.players).length)
    .map((g) => ({ ...g, at: Number(g.at) || 0, players: asList<HistoryPlayer>(g.players) }))
    .sort((a, b) => a.at - b.at)
}

/** Everyone's totals, best first: most wins, then best win rate, then most points. */
export function totals(games: HistoryGame[], only?: GameId): PlayerTotals[] {
  const by = new Map<string, PlayerTotals>()
  for (const g of games) {
    if (only && g.game !== only) continue
    for (const p of g.players) {
      const key = nameKey(p.name ?? '')
      if (!key) continue
      const t = by.get(key) ?? { key, name: p.name, games: 0, wins: 0, points: 0, byGame: {}, stats: {} }
      t.name = p.name.trim()
      t.badge = p.badge ?? t.badge
      const w = p.won ? 1 : 0
      const pts = Number(p.points) || 0
      t.games++
      t.wins += w
      t.points += pts
      const gt = t.byGame[g.game] ?? { games: 0, wins: 0, points: 0 }
      t.byGame[g.game] = { games: gt.games + 1, wins: gt.wins + w, points: gt.points + pts }
      for (const [k, n] of Object.entries(p.stats ?? {})) t.stats[`${g.game}.${k}`] = (t.stats[`${g.game}.${k}`] ?? 0) + (Number(n) || 0)
      by.set(key, t)
    }
  }
  return [...by.values()].sort(
    (a, b) => b.wins - a.wins || b.wins / b.games - a.wins / a.games || b.points - a.points || a.name.localeCompare(b.name),
  )
}

export interface HistoryTitle {
  stat: string
  game: GameId
  title: string
  icon: string
  text: string
}

/** The fun titles, each held by whoever has the most of one stat. */
export const RECORDS: HistoryTitle[] = [
  { stat: 'uljez.escaped', game: 'uljez', icon: '🥷', title: 'Neuhvatljivi', text: 'puta pobegao kao uljez' },
  { stat: 'uljez.caught', game: 'uljez', icon: '🚨', title: 'Uvek uhvaćen', text: 'puta uhvaćen kao uljez' },
  { stat: 'uljez.spot', game: 'uljez', icon: '🔍', title: 'Detektiv', text: 'glasova na pravog uljeza' },
  { stat: 'uljez.word', game: 'uljez', icon: '🧠', title: 'Čitač misli', text: 'puta pogodio reč kao uhvaćen uljez' },
  { stat: 'blef.fooled', game: 'blef', icon: '🤥', title: 'Majstor laži', text: 'drugara navukao na laž' },
  { stat: 'blef.truth', game: 'blef', icon: '💡', title: 'Tragač istine', text: 'puta pronašao istinu' },
  { stat: 'talas.bull', game: 'talas', icon: '🎯', title: 'Telepata', text: 'punih pogodaka' },
  { stat: 'kviz.right', game: 'kviz', icon: '📚', title: 'Enciklopedija', text: 'tačnih odgovora' },
  { stat: 'kviz.robs', game: 'kviz', icon: '💰', title: 'Lopov', text: 'poena otetih u Pljački' },
  { stat: 'licitacija.sets', game: 'licitacija', icon: '🎟️', title: 'Licitator', text: 'dobijenih partija' },
  { stat: 'misija.spyWin', game: 'misija', icon: '🦹', title: 'Glavni špijun', text: 'pobeda kao špijun' },
]

/** Who holds each title (ties share it). Titles nobody has earned yet are left out. */
export function records(table: PlayerTotals[], only?: GameId): { record: HistoryTitle; value: number; holders: PlayerTotals[] }[] {
  return RECORDS.filter((r) => !only || r.game === only)
    .map((record) => {
      const value = Math.max(0, ...table.map((t) => t.stats[record.stat] ?? 0))
      return { record, value, holders: table.filter((t) => value > 0 && (t.stats[record.stat] ?? 0) === value) }
    })
    .filter((r) => r.value > 0)
}
