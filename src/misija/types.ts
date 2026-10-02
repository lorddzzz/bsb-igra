/** Secret roles. The crew wants missions to succeed, the spies want them to fail. */
export type Role = 'ekipa' | 'menadzer' | 'telohranitelj' | 'spijun' | 'imitator' | 'senka' | 'fan'

export type Side = 'ekipa' | 'spijuni'

export interface MissionResult {
  /** Who went on the mission, as team/{uid} = true. */
  team: Record<string, boolean>
  fails: number
  /** Sabotages it took to fail this mission (2 on the 4th mission with 7+ players). */
  needed: number
  ok: boolean
}

export interface TeamVote {
  mission: number
  leader: string
  team: Record<string, boolean>
  /** Each player's vote, true = for. Missing when the team went without a vote. */
  votes?: Record<string, boolean>
  approved: boolean
}

/** Lives at rooms/{code}/pub/misija. */
export interface MisijaState {
  /** How many special roles are in play, 0 to 5; they always come in the same order. */
  specials?: number
  /** Random per game; keys the secret mission cards so an old game's cards never count. */
  game?: string
  /** Who leads first (index in join order); the leader passes on with every proposal. */
  offset?: number
  /** Team proposals made so far this game. */
  turn?: number
  /** Rejected proposals in a row for the current mission. */
  rejects?: number
  /** The leader's picks, as team/{uid} = true. */
  team?: Record<string, boolean>
  /** Votes on the proposed team, by uid. Only counted once everyone has voted. */
  votes?: Record<string, boolean>
  /** Team members who have played their mission card. */
  played?: Record<string, boolean>
  /** The last team vote, shown while the next leader picks. */
  lastVote?: TeamVote
  /** Mission results by mKey(mission), i.e. m1 to m5. */
  results?: Record<string, MissionResult>
  /** Who the spies named as the Menadžer at the end. */
  shot?: string
  winner?: Side
  /** Games won by each side in this room. */
  tally?: Partial<Record<Side, number>>
}

/** Each player's private card. Lives at rooms/{code}/tickets/{uid}. */
export interface MisijaTicket {
  /** The game it belongs to (MisijaState.game). */
  game: string
  role: Role
  /** Players this role gets to see (spies for most, the Menadžer for the Telohranitelj). */
  sees?: string[]
}

/** Lives at rooms/{code}/secret/misija, readable only on the reveal and end screens. */
export interface MisijaSecret {
  game?: string
  roles?: Record<string, Role>
  /** Mission cards by mKey(mission) then uid: true = success, false = sabotage. */
  plays?: Record<string, Record<string, boolean>>
}
