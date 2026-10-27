export interface WaveResult {
  round: number
  /** Points earned this round, with a short reason per point source. */
  gains: Record<string, { points: number; reasons?: string[] }>
}

/** Lives at rooms/{code}/pub/wave. */
export interface WaveState {
  /** Rounds in this game: every player gives clues twice. */
  total?: number
  /** Who gives the first clue (index in join order); then it rotates. */
  offset?: number
  /** Scales already used in this room, so a new game brings new ones. */
  seen?: string[]
  /** The two scales the clue giver may choose from this round. */
  choices?: string[]
  scale?: string
  /** Where the target sits, 0 (left) to 100 (right). Only the clue giver's screen shows it. */
  target?: number
  clue?: string
  /** Each guesser's locked needle, 0 to 100. */
  guesses?: Record<string, number>
  result?: WaveResult
}
