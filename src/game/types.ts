import { gameDefinition } from '../games'
import type { Badge } from './badges'
import type { BlefState } from '../blef/types'
import type { CijaState } from '../cija/types'
import type { KvizState } from '../kviz/types'
import type { MisijaState } from '../misija/types'
import type { LicState } from '../licitacija/types'
import type { WaveState } from '../talas/types'

export type Phase =
  | 'lobby'
  | 'category'
  | 'clues'
  | 'voting'
  | 'reveal'
  | 'guess'
  | 'score'
  | 'over'
  // Blef
  | 'write'
  | 'pick'
  | 'truth'
  // Talasna dužina
  | 'clue'
  | 'aim'
  | 'result'
  // Kviz
  | 'question'
  | 'answer'
  // Misija
  | 'intro'
  | 'team'
  | 'vote'
  | 'mission'
  // Licitacija
  | 'bid'
  | 'duel'
  | 'set'
  // Čije je ovo?
  | 'match'

/** Which game a room plays. Rooms from before the game picker have none and play Uljez. */
export type GameId = 'uljez' | 'blef' | 'talas' | 'kviz' | 'licitacija' | 'misija' | 'cija'

export type Mode = 'quick' | 'normal' | 'endless'

export const MODES: { id: Mode; name: string; detail: string; target: number | null }[] = [
  { id: 'quick', name: 'Brza', detail: 'do 5 poena', target: 5 },
  { id: 'normal', name: 'Normalna', detail: 'do 10 poena', target: 10 },
  { id: 'endless', name: 'Beskonačna', detail: 'igrate dok vam ne dosadi', target: null },
]

export { BADGES, EXTRA_BADGES, ALL_BADGES } from './badges'
export type { Badge } from './badges'

/** The badges players can pick from; missing game means legacy Uljez. */
export function badgesFor(game: string | undefined): Badge[] {
  return gameDefinition(game)?.badges ?? []
}

export const MIN_PLAYERS = 3
/** How many people each player may vote for, since a round can have more than one impostor. */
export const MAX_VOTES = 2

export interface Player {
  name: string
  badge: string
  joinedAt: number
}

export interface RoundResult {
  round: number
  impostors: string[]
  word: string
  category: string
  /** Impostors who got caught. Firebase drops empty arrays, so read with `?? []`. */
  caught?: string[]
  /** Caught impostors who guessed the word. */
  guessedRight?: string[]
  /** Points earned this round, with a short reason per point source. */
  gains: Record<string, { points: number; reasons?: string[] }>
}

/**
 * Everything every player may see. Lives at rooms/{code}/pub.
 *
 * Shared by all games, but the top-level `category` ... `impostorStreak` fields and `phase` values belong to Uljez
 * (the first game). Moving them under their own key would change stored rooms, so they stay until a migration is planned.
 */
export interface Pub {
  hostUid: string
  game?: GameId
  /** Missing in legacy rooms; bump only for incompatible room/move changes. */
  protocol?: number
  createdAt: number
  /** Random per game; seeds the category choices. Missing in rooms from older versions. */
  seed?: number
  /** Random per game; who of the players (in join order) picks the category first. */
  pickerOffset?: number
  mode: Mode
  phase: Phase
  round: number
  players?: Record<string, Player>
  category?: string
  starter?: string
  /** Each player's suspects (up to MAX_VOTES), as votes/{voter}/{target} = true. */
  votes?: Record<string, Record<string, boolean> | string>
  /** Players who confirmed their vote. */
  locked?: Record<string, boolean>
  /** Word guesses by caught impostors, by uid. */
  guesses?: Record<string, string>
  scores?: Record<string, number>
  last?: RoundResult
  usedWords?: string[]
  /** How many rounds in a row each player has been an impostor. */
  impostorStreak?: Record<string, number>
  /**
   * Running counts for the all-time scoreboard, per player then stat (times caught as impostor, people
   * fooled, right answers...). Cleared when a game starts.
   */
  stats?: Record<string, Record<string, number>>
  /** Blef's own state; only in Blef rooms. */
  blef?: BlefState
  /** Talasna dužina's own state; only in those rooms. */
  wave?: WaveState
  /** Kviz's own state; only in Kviz rooms. */
  kviz?: KvizState
  /** Misija's own state; only in Misija rooms. */
  misija?: MisijaState
  /** Licitacija's own state; only in those rooms. */
  lic?: LicState
  /** Čije je ovo?'s own state; only in those rooms. */
  cija?: CijaState
}

/** One player's private card for the round. Lives at rooms/{code}/tickets/{uid}. */
export interface Ticket {
  round: number
  category: string
  /** null when this player is the impostor */
  word: string | null
}

/** Round answers, readable only once voting is over. Lives at rooms/{code}/secret. */
export interface Secret {
  round: number
  impostors: string[]
  word: string
  category: string
  options: string[]
}
