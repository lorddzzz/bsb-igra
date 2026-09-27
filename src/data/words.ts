export interface Category {
  id: string
  name: string
  icon: string
  words: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'muzika',
    name: 'Muzika i koncert',
    icon: '🎤',
    words: [
      'Gitara', 'Bubnjevi', 'Mikrofon', 'Bis', 'Bina', 'Publika', 'Karta', 'Majica benda',
      'Fotoaparat', 'Zvučnik', 'Ploča', 'Slušalice', 'Refren', 'Pevač', 'Koreografija', 'Upaljač',
      'Reflektor', 'Obezbeđenje', 'Garderoba', 'Stadion', 'Aplauz', 'Karaoke', 'Gramofon', 'Turneja',
    ],
  },
  {
    id: 'devedesete',
    name: 'Devedesete',
    icon: '📼',
    words: [
      'Tamagoči', 'Diskmen', 'Kaseta', 'Pejdžer', 'Videoteka', 'Tetris', 'Walkman', 'Nokia 3310',
      'Disketa', 'Gumene narukvice', 'Poster', 'Boy bend', 'MTV', 'Dial-up internet', 'Sličice', 'Polaroid',
      'Flomasteri', 'Rolšue', 'Game Boy', 'Spice Girls', 'Frizura sa gelom', 'Titanik', 'Pidžama žurka', 'Spomenar',
    ],
  },
  {
    id: 'hrana',
    name: 'Hrana i piće',
    icon: '🍕',
    words: [
      'Pica', 'Ćevapi', 'Burek', 'Palačinke', 'Sarma', 'Sladoled', 'Kafa', 'Pivo',
      'Rakija', 'Kokice', 'Hamburger', 'Sushi', 'Pomfrit', 'Kajmak', 'Pljeskavica', 'Čokolada',
      'Jogurt', 'Limunada', 'Sendvič', 'Gibanica', 'Lubenica', 'Ajvar', 'Krofna', 'Špagete',
    ],
  },
  {
    id: 'putovanje',
    name: 'Putovanje',
    icon: '✈️',
    words: [
      'Aerodrom', 'Pasoš', 'Kofer', 'Hotel', 'Plaža', 'Autobus', 'Mapa', 'Suvenir',
      'Razglednica', 'Kamp', 'Stjuardesa', 'Carina', 'Taksi', 'Voz', 'Ranac', 'Apartman',
      'Krema za sunčanje', 'Gužva', 'Selfi', 'Menjačnica', 'Muzej', 'Brod', 'Kapija', 'Budilnik',
    ],
  },
  {
    id: 'zurka',
    name: 'Žurka',
    icon: '🎉',
    words: [
      'Balon', 'Torta', 'DJ', 'Konfete', 'Koktel', 'Kostim', 'Plesni podijum', 'Led kocke',
      'Poklon', 'Svećice', 'Maskenbal', 'Mamurluk', 'Diskokugla', 'Čaše', 'Komšija', 'Slamčica',
      'Rođendan', 'Zdravica', 'Grickalice', 'Sveće', 'Hladnjak', 'Selfi štap', 'Ples', 'Ponoć',
    ],
  },
  {
    id: 'zivotinje',
    name: 'Životinje',
    icon: '🐾',
    words: [
      'Mačka', 'Pas', 'Slon', 'Žirafa', 'Pingvin', 'Majmun', 'Krokodil', 'Delfin',
      'Sova', 'Lav', 'Zec', 'Kornjača', 'Papagaj', 'Ajkula', 'Konj', 'Kengur',
      'Pčela', 'Hobotnica', 'Medved', 'Lisica', 'Jež', 'Flamingo', 'Krava', 'Panda',
    ],
  },
  {
    id: 'sport',
    name: 'Sport',
    icon: '⚽',
    words: [
      'Fudbal', 'Košarka', 'Tenis', 'Plivanje', 'Skijanje', 'Boks', 'Odbojka', 'Golf',
      'Maraton', 'Sudija', 'Pištaljka', 'Medalja', 'Teretana', 'Bicikl', 'Pikado', 'Šah',
      'Penal', 'Navijač', 'Dres', 'Stoni tenis', 'Kuglanje', 'Surfovanje', 'Joga', 'Trofej',
    ],
  },
  {
    id: 'kuca',
    name: 'Kuća i stan',
    icon: '🏠',
    words: [
      'Frižider', 'Kauč', 'Tuš', 'Jastuk', 'Veš mašina', 'Daljinski', 'Ogledalo', 'Lift',
      'Terasa', 'Zavesa', 'Tepih', 'Lampa', 'Ključ', 'Usisivač', 'Tiganj', 'Budilnik',
      'Fen', 'Ormar', 'Četkica za zube', 'Radijator', 'Sušilica', 'Pegla', 'Mikrotalasna', 'Otirač',
    ],
  },
  {
    id: 'poslovi',
    name: 'Zanimanja',
    icon: '👷',
    words: [
      'Lekar', 'Pilot', 'Kuvar', 'Policajac', 'Vatrogasac', 'Učitelj', 'Frizer', 'Konobar',
      'Programer', 'Zubar', 'Poštar', 'Mađioničar', 'Astronaut', 'Fotograf', 'Taksista', 'Farmer',
      'Advokat', 'Glumac', 'Pekar', 'Detektiv', 'Klovn', 'Veterinar', 'Arhitekta', 'Spasilac',
    ],
  },
]

export function getCategory(id: string): Category {
  const c = CATEGORIES.find((x) => x.id === id)
  if (!c) throw new Error(`Nepoznata kategorija: ${id}`)
  return c
}
