/** Attack cards: each makes one friend's current question harder to answer. */
export type CardId =
  | 'zamrzni'
  | 'magla'
  | 'mesalica'
  | 'ogledalo'
  | 'naopako'
  | 'mrak'
  | 'samoglasnici'
  | 'kasni'
  | 'kap'
  | 'sitna'
  | 'kisa'

export interface Card {
  id: CardId
  name: string
  icon: string
  /** What it does to the victim, shown on the card and in the rules. */
  effect: string
}

export const CARDS: Card[] = [
  { id: 'zamrzni', name: 'Zamrzni', icon: '⏱', effect: 'tajmer mu je 5 s kraći' },
  { id: 'magla', name: 'Magla', icon: '🌫', effect: 'pitanje mu je mutno 4 s' },
  { id: 'mesalica', name: 'Mešalica', icon: '🔀', effect: 'odgovori mu stalno menjaju mesta' },
  { id: 'ogledalo', name: 'Ogledalo', icon: '🪞', effect: 'sve mu je u ogledalu' },
  { id: 'naopako', name: 'Naopako', icon: '🙃', effect: 'ekran mu je naopako' },
  { id: 'mrak', name: 'Mrak', icon: '🔦', effect: 'vidi samo pod prstom' },
  { id: 'samoglasnici', name: 'Bez samoglasnika', icon: '🔤', effect: 'pitanje bez samoglasnika' },
  { id: 'kasni', name: 'Kasni start', icon: '🐢', effect: 'odgovori stižu tek za 4 s' },
  { id: 'kap', name: 'Kap po kap', icon: '💧', effect: 'pitanje stiže reč po reč' },
  { id: 'sitna', name: 'Sitna slova', icon: '🔍', effect: 'sve mu je sitno' },
  { id: 'kisa', name: 'BSB kiša', icon: '🕺', effect: 'Backstreet Boysi mu padaju po ekranu' },
]

export function getCard(id: string | undefined): Card {
  return CARDS.find((c) => c.id === id) ?? CARDS[0]
}

/** Special rounds, announced before the question. */
export type SpecialId = 'dupli' | 'munja' | 'haos' | 'pljacka'

export const SPECIALS: Record<SpecialId, { name: string; icon: string; text: string }> = {
  dupli: { name: 'Dupli poeni', icon: '✖️2', text: 'Tačan odgovor vredi 2 poena.' },
  munja: { name: 'Munja', icon: '⚡', text: 'Samo 5 sekundi za sve!' },
  haos: { name: 'Haos', icon: '🌀', text: 'Svako dobija nasumičan napad.' },
  pljacka: { name: 'Pljačka', icon: '💰', text: 'Tačan odgovor otima 1 poen od vođe.' },
}
