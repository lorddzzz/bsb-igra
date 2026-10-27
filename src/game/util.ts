import type { Pub, Secret } from './types'

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

/** Adds to the running counts for the all-time scoreboard. Zero counts are left out. */
export function addStats(
  stats: Pub['stats'],
  add: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = { ...(stats ?? {}) }
  for (const [uid, counts] of Object.entries(add))
    for (const [key, n] of Object.entries(counts)) {
      if (!n) continue
      out[uid] = { ...(out[uid] ?? {}), [key]: (out[uid]?.[key] ?? 0) + n }
    }
  return out
}

/** Leaders by score, highest first. */
export function standings(pub: Pub): { uid: string; score: number }[] {
  return playerOrder(pub)
    .map((uid) => ({ uid, score: pub.scores?.[uid] ?? 0 }))
    .sort((a, b) => b.score - a.score)
}

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPRSTUVZ'

export function makeRoomCode(rng: Rng): string {
  return Array.from({ length: 4 }, () => pickOne([...ROOM_ALPHABET], rng)).join('')
}
