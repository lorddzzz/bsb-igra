import type { PrviLevel } from '../data/prviPrompts'

export interface PrviResult {
  round: number
  /** Votes each player received this round; players nobody voted for are left out. */
  counts?: Record<string, number>
  /** Who takes this prompt's title: the most-voted players. Empty when every vote went to a different player. */
  top?: string[]
  /** Points earned this round, with a short reason. */
  gains: Record<string, { points: number; reasons?: string[] }>
}

/** Lives at rooms/{code}/pub/prvi. */
export interface PrviState {
  /** How personal the prompts get; the host picks it in the lobby. */
  level?: PrviLevel
  /** This game's prompts in order, one per round. */
  prompts?: string[]
  /** Every prompt already asked in this room, so a new game brings new ones. */
  seen?: string[]
  /** Confirmed votes for the current prompt: votes[voter] = the player they picked. */
  votes?: Record<string, string>
  result?: PrviResult
  /** The prompt ids whose title each player took this game. */
  titles?: Record<string, string[]>
}
