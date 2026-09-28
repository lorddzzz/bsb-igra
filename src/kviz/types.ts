import type { CardId, SpecialId } from './cards'

/** An attack on one player during the current question. */
export interface Attack {
  card: CardId
  /** Who played it; 'haos' for the Haos round's random attacks. */
  from: string
  /** When it hit, on the server clock (ms). */
  at: number
}

export interface KvizResult {
  round: number
  /** Which shown option (0 to 3) was right. */
  correct: number
  /** What each player had picked when time ran out, as shown option index. */
  picks?: Record<string, number>
  /** Points earned this round, with a short reason per point source. */
  gains: Record<string, { points: number; reasons?: string[] }>
  /** Last-placed players who got a bonus card after this question. */
  bonus?: string[]
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
  /** How long this question gives to answer (ms); shorter in a Munja round. */
  answerMs?: number
  /** Special rounds of this game, by key `r{round}`. */
  specials?: Record<string, SpecialId>
  /** Each player's attack cards. */
  hands?: Record<string, CardId[]>
  /** Attacks on the current question, by victim. At most one per victim. */
  attacks?: Record<string, Attack>
  /** Each player's pick, as shown option index. */
  answers?: Record<string, number>
  result?: KvizResult
}
