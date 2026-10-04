import type { GameId } from './game/types'

/** The games on the home screen, in order. */
export const GAMES: { id: GameId; name: string; icon: string; tagline: string; players: string }[] = [
  { id: 'uljez', name: 'ULJEZ', icon: '🕵️', tagline: 'Svi znaju tajnu reč. Osim uljeza.', players: '3 do 12 igrača' },
  { id: 'blef', name: 'BLEF', icon: '🤥', tagline: 'Izmisli laž, pronađi istinu.', players: '3 do 5, najbolje 3 ili 4' },
  { id: 'talas', name: 'TALAS', icon: '📡', tagline: 'Talasna dužina: pogodi šta je drugar mislio.', players: '3 do 5 igrača' },
  { id: 'kviz', name: 'KVIZ', icon: '⏱️', tagline: 'Isto pitanje, isti sat, 4 odgovora. Brzo!', players: '3 do 5 igrača' },
  { id: 'licitacija', name: 'LICITACIJA', icon: '🎟️', tagline: 'Ti protiv drugara. Tajna ponuda, ko da više?', players: 'tačno 2 igrača' },
  { id: 'misija', name: 'MISIJA', icon: '🦹', tagline: 'Velika ekipa, skriveni špijuni. Kome veruješ?', players: '5 do 12, najbolje 8+' },
]
