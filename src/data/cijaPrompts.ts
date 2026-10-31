/**
 * Prompts for "Čije je ovo?": a personal question every player answers anonymously, then everyone tries to
 * match the answers to the friends who wrote them. The host picks how personal the game gets.
 * Answers are short (a few words), so each prompt can be answered in one line.
 */
export type CijaLevel = 'lagano' | 'srednje' | 'ljuto'

export interface CijaPrompt {
  id: string
  level: CijaLevel
  q: string
}

export const CIJA_LEVELS: { id: CijaLevel; name: string; detail: string }[] = [
  { id: 'lagano', name: 'Lagano', detail: 'za upoznavanje' },
  { id: 'srednje', name: 'Srednje', detail: 'za drugare' },
  { id: 'ljuto', name: 'Ljuto', detail: 'za bliske' },
]

export const CIJA_PROMPTS: CijaPrompt[] = [
  // Lagano: smešno i bezazleno, dobro i za ljude koji se tek upoznaju.
  { id: 'l01', level: 'lagano', q: 'Najčudnija stvar koju sam ikada jeo/la' },
  { id: 'l02', level: 'lagano', q: 'Jelo koje nikad više ne bih probao/la' },
  { id: 'l03', level: 'lagano', q: 'Pesma koju pevam kad misle da me niko ne čuje' },
  { id: 'l04', level: 'lagano', q: 'Moja tajna supermoć bila bi…' },
  { id: 'l05', level: 'lagano', q: 'Film koji sam gledao/la više od pet puta' },
  { id: 'l06', level: 'lagano', q: 'Najgori savet koji sam dobio/la' },
  { id: 'l07', level: 'lagano', q: 'Poklon koji ne bih voleo/la da dobijem' },
  { id: 'l08', level: 'lagano', q: 'Moj najčudniji strah' },
  { id: 'l09', level: 'lagano', q: 'Stvar koju uvek zaboravim da ponesem' },
  { id: 'l10', level: 'lagano', q: 'Izgovor koji najčešće koristim kad zakasnim' },
  { id: 'l11', level: 'lagano', q: 'Životinja u koju bih se pretvorio/la na jedan dan' },
  { id: 'l12', level: 'lagano', q: 'Moja navika koja drugare najviše nervira' },
  { id: 'l13', level: 'lagano', q: 'Prva stvar koju bih kupio/la da dobijem milion evra' },
  { id: 'l14', level: 'lagano', q: 'Najčudnija stvar koju imam u stanu' },
  { id: 'l15', level: 'lagano', q: 'Šta radim kad ne mogu da zaspim' },
  { id: 'l16', level: 'lagano', q: 'Reč koju stalno pogrešno izgovaram' },
  { id: 'l17', level: 'lagano', q: 'Mesto na kom bih najradije proveo/la jedan dan' },
  { id: 'l18', level: 'lagano', q: 'Najveća glupost koju sam kupio/la' },
  { id: 'l19', level: 'lagano', q: 'Serija koju bih mogao/la da gledam bez kraja' },
  { id: 'l20', level: 'lagano', q: 'Superheroj koji mi je najsličniji' },

  // Srednje: malo neprijatnih priča, ali među drugarima.
  { id: 's01', level: 'srednje', q: 'Najneprijatnija stvar koja mi se desila pred svima' },
  { id: 's02', level: 'srednje', q: 'Najveća laž koju sam rekao/la kao dete' },
  { id: 's03', level: 'srednje', q: 'Nešto u čemu sam tajno veoma dobar/dobra' },
  { id: 's04', level: 'srednje', q: 'Kad sam se smejao/la, a nije smelo' },
  { id: 's05', level: 'srednje', q: 'Moj najveći modni promašaj' },
  { id: 's06', level: 'srednje', q: 'Posao iz snova koji nikad neću raditi' },
  { id: 's07', level: 'srednje', q: 'Najluđa stvar koju bih uradio/la za 100 evra' },
  { id: 's08', level: 'srednje', q: 'Nešto u šta sam kao dete verovao/la, a nije istina' },
  { id: 's09', level: 'srednje', q: 'Zadovoljstvo zbog kog se pomalo stidim' },
  { id: 's10', level: 'srednje', q: 'Najčudnija stvar koju sam pretraživao/la na internetu' },
  { id: 's11', level: 'srednje', q: 'Najgluplja stvar zbog koje sam se posvađao/la' },
  { id: 's12', level: 'srednje', q: 'Nešto što radim samo kad sam sâm/sama kod kuće' },
  { id: 's13', level: 'srednje', q: 'Najčudniji nadimak koji sam ikad imao/la' },
  { id: 's14', level: 'srednje', q: 'Doba u kom bih voleo/la da sam živeo/la' },
  { id: 's15', level: 'srednje', q: 'Pesma zbog koje bih se zacrveneo/la da je neko nađe na mom telefonu' },
  { id: 's16', level: 'srednje', q: 'Najluđi san kog se sećam' },
  { id: 's17', level: 'srednje', q: 'Kad sam skroz pogrešno razumeo/la situaciju' },
  { id: 's18', level: 'srednje', q: 'Šta bih prvo uradio/la da sam jedan dan nevidljiv/a' },
  { id: 's19', level: 'srednje', q: 'Najgore što sam ikada zakasnio/la na nešto' },
  { id: 's20', level: 'srednje', q: 'Stvar koju sam rekao/la pogrešnoj osobi' },

  // Ljuto: za bliske drugare, ali bez ičega što bi nekoga povredilo.
  { id: 'j01', level: 'ljuto', q: 'Najsramnija stvar koju su moji roditelji videli da radim' },
  { id: 'j02', level: 'ljuto', q: 'Nešto zbog čega sam skoro dobio/la kaznu' },
  { id: 'j03', level: 'ljuto', q: 'Najgluplji način na koji sam pokušao/la da impresioniram simpatiju' },
  { id: 'j04', level: 'ljuto', q: 'Tajna koju sam čuvao/la od ove družine' },
  { id: 'j05', level: 'ljuto', q: 'Nešto što sam uradio/la, a nikad nisam priznao/la' },
  { id: 'j06', level: 'ljuto', q: 'Najveća greška koju sam napravio/la u školi ili na poslu' },
  { id: 'j07', level: 'ljuto', q: 'Poruka koju sam poslao/la pogrešnoj osobi' },
  { id: 'j08', level: 'ljuto', q: 'Zbog čega sam bio/la ljubomoran/ljubomorna, a stidim se' },
  { id: 'j09', level: 'ljuto', q: 'Najluđe što sam uradio/la u tri ujutru' },
  { id: 'j10', level: 'ljuto', q: 'Tajna navika koju skoro niko ne zna' },
  { id: 'j11', level: 'ljuto', q: 'Prva stvar koju bih obrisao/la sa telefona da ga neko pregleda' },
  { id: 'j12', level: 'ljuto', q: 'Moja najveća mana, iskreno' },
  { id: 'j13', level: 'ljuto', q: 'Najgore što sam rekao/la nekome u ljutnji' },
  { id: 'j14', level: 'ljuto', q: 'Sitnica koju sam „pozajmio/la” i nikad vratio/la' },
  { id: 'j15', level: 'ljuto', q: 'Kad sam se poslednji put zaista osramotio/la' },
  { id: 'j16', level: 'ljuto', q: 'Prva stvar koju bih promenio/la na sebi' },
  { id: 'j17', level: 'ljuto', q: 'Zbog čega bih mogao/la da završim u novinama' },
  { id: 'j18', level: 'ljuto', q: 'Moj najveći životni haos' },
  { id: 'j19', level: 'ljuto', q: 'Čega se najviše plašim kad razmišljam o starosti' },
  { id: 'j20', level: 'ljuto', q: 'Pitanje kog se plašim da mi neko postavi' },
]

const BY_ID = new Map(CIJA_PROMPTS.map((p) => [p.id, p]))

/** A prompt by id; a stale id from an older version gets a harmless stand-in so a screen never crashes. */
export function getCijaPrompt(id: string): CijaPrompt {
  return BY_ID.get(id) ?? CIJA_PROMPTS[0]
}
