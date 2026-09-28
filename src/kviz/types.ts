export interface KvizResult {
  round: number
  /** Which shown option (0 to 3) was right. */
  correct: number
  /** What each player had picked when time ran out, as shown option index. */
  picks?: Record<string, number>
  /** Points earned this round, with a short reason per point source. */
  gains: Record<string, { points: number; reasons?: string[] }>
}

/** Lives at rooms/{code}/pub/kviz. */
export interface KvizState {
  /** Random per game, so each phone's clocks never mix up two games in the same room. */
  game?: string
  /** Questions in this game. */
  total?: number
  /** Question ids already asked in this room, so a new game brings new ones. */
  seen?: string[]
  /** This game's questions in order; question n is queue[n - 1]. */
  queue?: string[]
  /** How the current question's options are shuffled: shown option i is [a, ...w][order[i]]. */
  order?: number[]
  /**
   * When answering closes, on the database server's clock (ms). Every phone counts down to it with
   * its own estimate of the server time, so all clocks hit zero together even if phone clocks differ.
   */
  endsAt?: number
  /** When the reveal is over and the next question starts, server clock (ms). */
  nextAt?: number
  /** Each player's pick, as shown option index. */
  answers?: Record<string, number>
  result?: KvizResult
}
