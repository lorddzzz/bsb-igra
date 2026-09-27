export type Phase =
  | 'lobby'
  | 'category'
  | 'clues'
  | 'voting'
  | 'reveal'
  | 'guess'
  | 'score'
  | 'over'

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
}

export const BADGES: Badge[] = [
  { id: 'aj', name: 'AJ', color: '#ff5fd2' },
  { id: 'brian', name: 'Brian', color: '#5fd0ff' },
  { id: 'howie', name: 'Howie', color: '#ffd15f' },
  { id: 'kevin', name: 'Kevin', color: '#7dffb0' },
  { id: 'nick', name: 'Nick', color: '#b89bff' },
]

export const MIN_PLAYERS = 3
/** How many people each player may vote for, since a round can have two impostors. */
export const MAX_VOTES = 2
export const MAX_PLAYERS = BADGES.length

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
  createdAt: number
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
