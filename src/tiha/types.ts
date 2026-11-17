/**
 * A card is a two-character string: colour letter + number.
 * Colours 'r' (crvena), 'g' (zelena), 'b' (plava), 'y' (žuta) run 1–7; 'a' is the trump (adut), 1–3.
 * Examples: 'g7', 'a2'.
 */
export type TihaCard = string
export type TihaSuit = 'r' | 'g' | 'b' | 'y' | 'a'

/** What a signalled card is within its colour in the signaller's hand at the moment of the signal. */
export type TihaMark = 'high' | 'low' | 'only'

/**
 * One task of a mission.
 * - 'win': the owner must win the trick that contains `card`. `order: 'first'` means before any other
 *   'win' task of the mission is fulfilled; `order: 'last'` means after every other 'win' task.
 * - 'count': the owner must win exactly `n` tricks in the mission (n may be 0).
 * - 'last': the owner must win the mission's last trick.
 */
export interface TihaTask {
  id: number
  kind: 'win' | 'count' | 'last'
  card?: TihaCard
  n?: number
  order?: 'first' | 'last'
  /** Who took the task in the draft; missing until taken. */
  owner?: string
  /** Missing while open. */
  state?: 'done' | 'failed'
}

export interface TihaPlay {
  uid: string
  card: TihaCard
}

/**
 * Lives at rooms/{code}/pub/tiha. Hands are in pub like Licitacija's bids: friends are trusted and
 * the screens never show the partner's hand. Firebase drops empty lists and objects: read lists
 * with asList and objects with `?? {}`.
 *
 * pub.phase: 'lobby' → 'draft' → 'play' → 'result' → ('draft' of the next mission | 'over').
 * pub.round counts deals from 1 (every new mission attempt), so it guards transactions.
 */
export interface TihaState {
  /** Mission level, from 1. Rises by one after each success. */
  level?: number
  /** Lives left. */
  lives?: number
  /** Missions completed in this run. */
  cleared?: number
  /** Picks the first task and leads the first trick; alternates every deal. */
  captain?: string
  hands?: Record<string, TihaCard[]>
  /** Cards out of play this mission. Never shown before 'result'. */
  hidden?: TihaCard[]
  tasks?: TihaTask[]
  /** Whose move it is: in 'draft' who picks a task, in 'play' who plays a card. */
  turn?: string
  /** The trick in progress: empty or the lead card only. A finished trick moves to lastTrick at once. */
  table?: TihaPlay[]
  /** The last finished trick, lead card first. */
  lastTrick?: { cards: TihaPlay[]; winner: string }
  /** Tricks won this mission, by uid. */
  won?: Record<string, number>
  /** Tricks finished this mission. */
  tricks?: number
  /** Each player's one signal of the mission. The card stays in the hand. */
  signals?: Record<string, { card: TihaCard; mark: TihaMark }>
  /** Set in 'result' and 'over'. */
  outcome?: 'won' | 'lost'
  /** Id of the task that failed, when outcome is 'lost'. */
  failedTask?: number
}
