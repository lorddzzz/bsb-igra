export interface Badge {
  id: string
  name: string
  color: string
  /** Shown instead of the name's initials; the extra badges for big groups have one. */
  icon?: string
}

export const BADGES: Badge[] = [
  { id: 'vuk', name: 'Vuk', color: '#8fb6ff', icon: '🐺' },
  { id: 'soko', name: 'Soko', color: '#ffd60a', icon: '🦅' },
  { id: 'lisica', name: 'Lisica', color: '#ff7a3d', icon: '🦊' },
  { id: 'medved', name: 'Medved', color: '#c98a5b', icon: '🐻' },
  { id: 'zmaj', name: 'Zmaj', color: '#39e36a', icon: '🐉' },
]

/** Extra badges for big-group games, so 8 to 12 players all look different. */
export const EXTRA_BADGES: Badge[] = [
  { id: 'sova', name: 'Sova', color: '#c9a7ff', icon: '🦉' },
  { id: 'ris', name: 'Ris', color: '#ffb3c4', icon: '🐆' },
  { id: 'jelen', name: 'Jelen', color: '#d9b35c', icon: '🦌' },
  { id: 'ajkula', name: 'Ajkula', color: '#5ee7ff', icon: '🦈' },
  { id: 'skorpija', name: 'Škorpija', color: '#ff4d6d', icon: '🦂' },
  { id: 'vila', name: 'Vila', color: '#ff8be0', icon: '🧚' },
  { id: 'perun', name: 'Perun', color: '#e8eef7', icon: '⚡' },
]
export const ALL_BADGES: Badge[] = [...BADGES, ...EXTRA_BADGES]
