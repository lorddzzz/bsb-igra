import type { BlefState } from '../blef/types'
import type { KvizState } from '../kviz/types'
import type { MisijaState } from '../misija/types'
import type { WaveState } from '../wave/types'

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
  | 'team'
  | 'vote'
  | 'mission'

/** Which game a room plays. Rooms from before the game picker have none and play Uljez. */
export type GameId = 'uljez' | 'blef' | 'talas' | 'kviz' | 'misija'

export type Mode = 'quick' | 'normal' | 'endless'

export const MODES: { id: Mode; name: string; detail: string; target: number | null }[] = [
  { id: 'quick', name: 'Brza', detail: 'do 5 poena', target: 5 },
  { id: 'normal', name: 'Normalna', detail: 'do 10 poena', target: 10 },
  { id: 'endless', name: 'Beskonačna', detail: 'igrate dok vam ne dosadi', target: null },
]

export interface Badge {
  id: string
  name: string
  color: string
  /** Shown instead of the name's initials; the extra badges for big groups have one. */
  icon?: string
}

export const BADGES: Badge[] = [
  { id: 'aj', name: 'AJ', color: '#ff5fd2' },
  { id: 'brian', name: 'Brian', color: '#5fd0ff' },
  { id: 'howie', name: 'Howie', color: '#ffd15f' },
  { id: 'kevin', name: 'Kevin', color: '#7dffb0' },
  { id: 'nick', name: 'Nick', color: '#b89bff' },
]

/** Extra badges for big-group games, so 8 to 12 players all look different. */
export const EXTRA_BADGES: Badge[] = [
  { id: 'mic', name: 'Mikrofon', color: '#ff9a4d', icon: '🎤' },
  { id: 'gitara', name: 'Gitara', color: '#ff5f6d', icon: '🎸' },
  { id: 'disk', name: 'Disk', color: '#3fe0c5', icon: '💿' },
  { id: 'dens', name: 'Dens', color: '#e8eef7', icon: '🕺' },
  { id: 'zvezda', name: 'Zvezda', color: '#c8ff5f', icon: '⭐' },
  { id: 'vatra', name: 'Vatra', color: '#ffa3c4', icon: '🔥' },
  { id: 'mesec', name: 'Mesec', color: '#4d8bff', icon: '🌙' },
]
export const ALL_BADGES: Badge[] = [...BADGES, ...EXTRA_BADGES]

/** The badges players can pick from in a game: big-group games get the extra ones. */
export function badgesFor(game: GameId | undefined): Badge[] {
  return game === 'misija' ? ALL_BADGES : BADGES
}

export const MIN_PLAYERS = 3
/** How many people each player may vote for, since a round can have two impostors. */
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

/** Everything every player may see. Lives at rooms/{code}/pub. */
export interface Pub {
  hostUid: string
  game?: GameId
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
  /** Blef's own state; only in Blef rooms. */
  blef?: BlefState
  /** Talasna dužina's own state; only in those rooms. */
  wave?: WaveState
  /** Kviz's own state; only in Kviz rooms. */
  kviz?: KvizState
  /** Misija's own state; only in Misija rooms. */
  misija?: MisijaState
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
