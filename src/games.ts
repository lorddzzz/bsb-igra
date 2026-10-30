import { ALL_BADGES, BADGES, type Badge } from './game/badges'
import type { GameId } from './game/types'

export interface GameDefinition {
  id: GameId
  name: string
  icon: string
  tagline: string
  players: string
  maxPlayers: number
  badges: Badge[]
}

/** The games on the home screen, in order. */
export const GAMES: GameDefinition[] = [
  { id: 'uljez', name: 'ULJEZ', icon: '🕵️', tagline: 'Svi znaju tajnu reč. Osim uljeza.', players: '3 do 12 igrača', maxPlayers: 12, badges: ALL_BADGES },
  { id: 'blef', name: 'BLEF', icon: '🤥', tagline: 'Izmisli laž, pronađi istinu.', players: '3 do 5, najbolje 3 ili 4', maxPlayers: 5, badges: BADGES },
  { id: 'talas', name: 'TALAS', icon: '📡', tagline: 'Talasna dužina: pogodi šta je drugar mislio.', players: '3 do 5 igrača', maxPlayers: 5, badges: BADGES },
  { id: 'kviz', name: 'KVIZ', icon: '⏱️', tagline: 'Isto pitanje, isti sat, 4 odgovora. Brzo!', players: '3 do 5 igrača', maxPlayers: 5, badges: BADGES },
  { id: 'licitacija', name: 'LICITACIJA', icon: '🎟️', tagline: 'Ti protiv drugara. Tajna ponuda, ko da više?', players: 'tačno 2 igrača', maxPlayers: 2, badges: BADGES },
  { id: 'misija', name: 'MISIJA', icon: '🦹', tagline: 'Velika ekipa, skriveni špijuni. Kome veruješ?', players: '5 do 12, najbolje 8+', maxPlayers: 12, badges: ALL_BADGES },
]

/** Missing game IDs belong to rooms created before the game picker. */
export function gameDefinition(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((game) => game.id === (id === undefined ? 'uljez' : id))
}
