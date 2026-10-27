import type { ComponentType } from 'react'
import type { Backend } from './backend'
import type { RoomView } from './game/room'
import type { GameId } from './game/types'
import { lazyNamed } from './ui/lazyScreen'

export interface RoomScreenProps {
  be: Backend
  code: string
  view: RoomView
}

interface GameScreens {
  /** The game's screens, for a player inside a room. */
  Screen: ComponentType<RoomScreenProps>
  /** The "Kako se igra" text. */
  Rules: ComponentType
}

/**
 * Every game's UI, loaded only when needed so the first download holds the shell and not all games, however many
 * there are. Keep game content (words, questions) out of anything imported by the shell: only a game's own screens,
 * rules and logic should import it. Being a Record<GameId, ...>, forgetting a game is a type error.
 */
export const GAME_SCREENS: Record<GameId, GameScreens> = {
  uljez: {
    Screen: lazyNamed(() => import('./screens/Uljez'), 'Uljez'),
    Rules: lazyNamed(() => import('./screens/rules/Uljez'), 'UljezRules'),
  },
  blef: {
    Screen: lazyNamed(() => import('./screens/Blef'), 'Blef'),
    Rules: lazyNamed(() => import('./screens/rules/Blef'), 'BlefRules'),
  },
  talas: {
    Screen: lazyNamed(() => import('./screens/Talas'), 'Talas'),
    Rules: lazyNamed(() => import('./screens/rules/Talas'), 'TalasRules'),
  },
  kviz: {
    Screen: lazyNamed(() => import('./screens/Kviz'), 'Kviz'),
    Rules: lazyNamed(() => import('./screens/rules/Kviz'), 'KvizRules'),
  },
  licitacija: {
    Screen: lazyNamed(() => import('./screens/Licitacija'), 'Licitacija'),
    Rules: lazyNamed(() => import('./screens/rules/Licitacija'), 'LicitacijaRules'),
  },
  misija: {
    Screen: lazyNamed(() => import('./screens/Misija'), 'Misija'),
    Rules: lazyNamed(() => import('./screens/rules/Misija'), 'MisijaRules'),
  },
}

/** A room from a build that knows more games than this one falls back to Uljez, as it always did. */
export function screensFor(game: GameId | undefined): GameScreens {
  return GAME_SCREENS[game ?? 'uljez'] ?? GAME_SCREENS.uljez
}
