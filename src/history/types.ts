import type { GameId } from '../game/types'
import type { Side } from '../misija/types'

/** One player in a finished game. */
export interface HistoryPlayer {
  name: string
  badge?: string
  /** Final score; missing in games without points (Licitacija match, Misija). */
  points?: number
  won?: boolean
  /** Game-specific counts, e.g. times caught as impostor. Missing when all were zero. */
  stats?: Record<string, number>
  /** Misija only. */
  side?: Side
}

/** A finished game. Lives at history/{id}; written once by whichever phone gets there first. */
export interface HistoryGame {
  game: GameId
  /** Server clock (ms) when it was saved. */
  at: number
  room: string
  /** Firebase may hand a list back as an object, so read with asList. */
  players: HistoryPlayer[]
}
