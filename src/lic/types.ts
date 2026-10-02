/** One revealed round: both bids, what was on the table and who took it. */
export interface LicDuel {
  round: number
  bids: Record<string, number>
  /** Every ticket that was on the table, carried-over ones first. */
  pot: number[]
  /** Who took the pot; missing on a tie, when the pot stays on the table. */
  taker?: string
}

/** Lives at rooms/{code}/pub/lic. pub.scores holds the points of the current game. */
export interface LicState {
  /** Which game of the match this is, from 1. */
  set?: number
  /** Games won in this match. */
  wins?: Record<string, number>
  /** This game's tickets in the order they come up, one per round. */
  deck?: number[]
  /** Tickets left on the table by ties, added to the next round's pot. */
  carry?: number[]
  /** This round's secret bids. The screens never show the other player's bid before both are in. */
  bids?: Record<string, number>
  /** Cards each player has already used this game. Firebase drops empty lists, read with asList. */
  played?: Record<string, number[]>
  /** The last revealed round. */
  duel?: LicDuel
  /** Who won the game that just ended; missing when it was a draw. */
  setWinner?: string
}
