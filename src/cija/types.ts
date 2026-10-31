import type { CijaLevel } from '../data/cijaPrompts'

export interface CijaResult {
  round: number
  /**
   * Points earned this round, with a short reason per point source. `right` counts the answers this
   * player matched correctly, `fooled` the guessers their answer fooled (after the cap).
   */
  gains: Record<string, { points: number; reasons?: string[]; right?: number; fooled?: number }>
}

/** Lives at rooms/{code}/pub/cija. */
export interface CijaState {
  /** How personal the prompts get; the host picks it in the lobby. */
  level?: CijaLevel
  /** Prompts per game, 2 to 5. */
  rounds?: number
  /** This game's prompts in order, one per round. */
  prompts?: string[]
  /** Every prompt already asked in this room, so a new game brings new ones. */
  seen?: string[]
  /** Each player's anonymous answer for the current prompt. */
  answers?: Record<string, string>
  /**
   * The players whose answers are on the board, in the order the answers are shown (shuffled once the
   * last answer is in). The screen never shows these names before the reveal.
   */
  order?: string[]
  /** What each player thinks: guesses[guesser][answerOwner] = the player they say wrote it. */
  guesses?: Record<string, Record<string, string>>
  result?: CijaResult
}
