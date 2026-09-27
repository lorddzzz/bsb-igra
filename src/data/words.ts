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
  {
    id: 'grad',
    name: 'Grad',
    icon: '🏙️',
    words: [
      'Pekara', 'Apoteka', 'Semafor', 'Trafika', 'Pijaca', 'Bioskop', 'Park', 'Most',
      'Tramvaj', 'Benzinska pumpa', 'Bolnica', 'Biblioteka', 'Fontana', 'Parking', 'Banka', 'Pošta',
      'Tržni centar', 'Zoološki vrt', 'Pešački prelaz', 'Klupa',
    ],
  },
  {
    id: 'priroda',
    name: 'Priroda',
    icon: '🌋',
    words: [
      'Planina', 'Reka', 'Vodopad', 'Pećina', 'Vulkan', 'Pustinja', 'Šuma', 'Jezero',
      'Ostrvo', 'Duga', 'Oluja', 'Munja', 'Sneg', 'Magla', 'Kaktus', 'Suncokret',
      'Pečurka', 'Zalazak sunca', 'Glečer', 'Livada',
    ],
  },
  {
    id: 'odeca',
    name: 'Odeća i modni detalji',
    icon: '👗',
    words: [
      'Jakna', 'Farmerke', 'Kravata', 'Šešir', 'Čarape', 'Patike', 'Štikle', 'Kaiš',
      'Rukavice', 'Šal', 'Kupaći kostim', 'Pidžama', 'Haljina', 'Suknja', 'Kapa', 'Naočare za sunce',
      'Ručni sat', 'Ogrlica', 'Minđuše', 'Tašna',
    ],
  },
  {
    id: 'tehnologija',
    name: 'Tehnologija',
    icon: '📱',
    words: [
      'Telefon', 'Laptop', 'Punjač', 'Wi-Fi', 'Lozinka', 'Emodži', 'Dron', 'Robot',
      'Tastatura', 'Miš', 'Štampač', 'Televizor', 'Konzola', 'Bluetooth', 'Aplikacija', 'Pametni sat',
      'Baterija', 'Kamera', 'Fleš memorija', 'Instagram',
    ],
  },
  {
    id: 'filmovi',
    name: 'Filmski likovi',
    icon: '🎬',
    words: [
      'Hari Poter', 'Betmen', 'Supermen', 'Šrek', 'Džems Bond', 'Darth Vader', 'Spajdermen', 'Pepeljuga',
      'Tarzan', 'Mr. Bin', 'Miki Maus', 'Petar Pan', 'Drakula', 'Terminator', 'Šerlok Holms', 'Pinokio',
      'Snežana', 'Kralj lavova', 'Indijana Džons', 'Džek Sparou',
    ],
  },
  {
    id: 'skola',
    name: 'Škola',
    icon: '🎒',
    words: [
      'Tabla', 'Kreda', 'Dnevnik', 'Pernica', 'Gumica', 'Lenjir', 'Užina', 'Veliki odmor',
      'Ekskurzija', 'Pismeni zadatak', 'Puškica', 'Direktor', 'Razredni', 'Zvono', 'Fizičko', 'Matura',
      'Svedočanstvo', 'Kontrolni', 'Atlas', 'Šestar',
    ],
  },
  {
    id: 'posao',
    name: 'Posao i kancelarija',
    icon: '💼',
    words: [
      'Sastanak', 'Šef', 'Plata', 'Mejl', 'Godišnji odmor', 'Aparat za kafu', 'Heftalica', 'Fascikla',
      'Bolovanje', 'Prekovremeni', 'Intervju', 'Vizit karta', 'Rok', 'Kolega', 'Prezentacija', 'Video poziv',
      'Otkaz', 'Penzija', 'Kravata', 'Liftovski razgovor',
    ],
  },
  {
    id: 'more',
    name: 'More i plaža',
    icon: '🏖️',
    words: [
      'Peškir', 'Suncobran', 'Školjka', 'Pesak', 'Talas', 'Ležaljka', 'Peraje', 'Dušek na naduvavanje',
      'Svetionik', 'Galeb', 'Jedrilica', 'Kula od peska', 'Rak', 'Meduza', 'Japanke', 'Kokos',
      'Luka', 'Opekotine', 'Ronjenje', 'Kukuruz na plaži',
    ],
  },
  {
    id: 'zima',
    name: 'Zima i praznici',
    icon: '🎄',
    words: [
      'Deda Mraz', 'Jelka', 'Sanke', 'Sneško Belić', 'Vatromet', 'Kuvano vino', 'Irvas', 'Kamin',
      'Klizaljke', 'Pahulja', 'Ukrasi', 'Čizme', 'Čestitka', 'Ledenica', 'Doček', 'Skije',
      'Šubara', 'Vruća čokolada', 'Poklon', 'Novogodišnja pesma',
    ],
  },
  {
    id: 'telo',
    name: 'Ljudsko telo',
    icon: '💪',
    words: [
      'Nos', 'Lakat', 'Koleno', 'Obrva', 'Trepavica', 'Pupak', 'Palac', 'Jezik',
      'Zub', 'Brada', 'Uvo', 'Rame', 'Peta', 'Nokat', 'Srce', 'Kosa',
      'Čelo', 'Obraz', 'Zglob', 'Kičma',
    ],
  },
  {
    id: 'bajke',
    name: 'Bajke i magija',
    icon: '🧙',
    words: [
      'Zmaj', 'Vila', 'Veštica', 'Čarobni štapić', 'Princeza', 'Zamak', 'Jednorog', 'Duh',
      'Vampir', 'Kristalna kugla', 'Leteći ćilim', 'Patuljak', 'Sirena', 'Div', 'Čarobnjak', 'Kruna',
      'Mač', 'Blago', 'Metla', 'Prsten',
    ],
  },
  {
    id: 'vozila',
    name: 'Vozila',
    icon: '🚗',
    words: [
      'Automobil', 'Motor', 'Trotinet', 'Helikopter', 'Podmornica', 'Traktor', 'Kamion', 'Hitna pomoć',
      'Gondola', 'Balon na vrući vazduh', 'Raketa', 'Kombi', 'Limuzina', 'Jahta', 'Skejtbord', 'Tenk',
      'Žičara', 'Kočija', 'Metro', 'Kajak',
    ],
  },
  {
    id: 'voce',
    name: 'Voće i povrće',
    icon: '🍓',
    words: [
      'Jabuka', 'Banana', 'Ananas', 'Jagoda', 'Kruška', 'Grožđe', 'Limun', 'Paradajz',
      'Krastavac', 'Šargarepa', 'Crni luk', 'Beli luk', 'Krompir', 'Paprika', 'Kupus', 'Tikvica',
      'Avokado', 'Mango', 'Trešnja', 'Kivi',
    ],
  },
  {
    id: 'igre',
    name: 'Igre i zabava',
    icon: '🎲',
    words: [
      'Karte', 'Domine', 'Kocka', 'Monopol', 'Žmurke', 'Jamb', 'Ne ljuti se čoveče', 'Remi',
      'Poker', 'Slagalica', 'Ukrštene reči', 'Asocijacije', 'Tvister', 'Bilijar', 'Fliper', 'Kviz',
      'Lutrija', 'Tombola', 'Kladionica', 'Pantomima',
    ],
  },
  {
    id: 'hobiji',
    name: 'Hobiji',
    icon: '🎨',
    words: [
      'Pecanje', 'Pletenje', 'Slikanje', 'Kuvanje', 'Baštovanstvo', 'Planinarenje', 'Fotografisanje', 'Ples',
      'Čitanje', 'Video igre', 'Kampovanje', 'Biciklizam', 'Sviranje gitare', 'Skupljanje markica', 'Origami', 'Keramika',
      'Ronjenje', 'Pevanje', 'Pravljenje kolača', 'Puzzle',
    ],
  },
  {
    id: 'porodica',
    name: 'Slavlja i porodica',
    icon: '💍',
    words: [
      'Slavski kolač', 'Žito', 'Kum', 'Svadba', 'Mlada', 'Mladoženja', 'Tašta', 'Svekrva',
      'Baba', 'Deda', 'Unuk', 'Krštenje', 'Burma', 'Buket', 'Veo', 'Prase na ražnju',
      'Zdravica', 'Muzika uživo', 'Kumstvo', 'Rodbina',
    ],
  },
  {
    id: 'fanovi',
    name: 'Fan zona',
    icon: '🌟',
    words: [
      'Autogram', 'Plakat', 'Fan klub', 'Transparent', 'Suze radosti', 'Vrisak', 'Prvi red', 'Merč',
      'Meet and greet', 'Slika sa idolom', 'Tetovaža', 'Ljubavno pismo', 'Svetleći štapić', 'Red ispred ulaza', 'Setlista', 'Majica sa likom',
      'Bis', 'Poster u sobi', 'Dvogled', 'Glasovna poruka drugarici',
    ],
  },
  {
    id: 'kupovina',
    name: 'Kupovina',
    icon: '🛍️',
    words: [
      'Korpa', 'Kasa', 'Popust', 'Račun', 'Kupon', 'Izlog', 'Kabina za probu', 'Kesa',
      'Kartica', 'Kusur', 'Rasprodaja', 'Reklamacija', 'Online porudžbina', 'Dostava', 'Buvljak', 'Etiketa',
      'Novčanik', 'Lista za kupovinu', 'Supermarket', 'Prodavac',
    ],
  },
]

export function getCategory(id: string): Category {
  const c = CATEGORIES.find((x) => x.id === id)
  if (!c) throw new Error(`Nepoznata kategorija: ${id}`)
  return c
}
