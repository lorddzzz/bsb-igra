/** One answer on the pick screen. */
export interface BlefOption {
  id: string
  text: string
  kind: 'truth' | 'lie' | 'house'
  /** Who wrote this fake (several people can write the same one). Firebase drops empty lists. */
  owners?: string[]
}

export interface BlefResult {
  round: number
  /** Points earned this question, with a short reason per point source. */
  gains: Record<string, { points: number; reasons?: string[] }>
}

/** Lives at rooms/{code}/pub/blef. */
export interface BlefState {
  /** This game's questions in order, one per round. */
  questions?: string[]
  /** Every question already asked in this room, so a new game brings new ones. */
  seen?: string[]
  /** Each player's fake answer for the current question. */
  lies?: Record<string, string>
  /** Each player's chosen option id. */
  picks?: Record<string, string>
  options?: BlefOption[]
  result?: BlefResult
}
