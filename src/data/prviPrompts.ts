/**
 * Prompts for "Ko bi prvi?": everyone votes for the friend who fits the prompt best, and whoever gets
 * the most votes takes the prompt's title for the night. The host picks how personal the game gets.
 * Prompts tease habits, not people: "ljuto" is more personal, never mean.
 */
export type PrviLevel = 'lagano' | 'srednje' | 'ljuto'

export interface PrviPrompt {
  id: string
  level: PrviLevel
  q: string
  /** The hero name the most-voted player earns for the rest of the night. */
  title: string
}

export const PRVI_LEVELS: { id: PrviLevel; name: string; detail: string }[] = [
  { id: 'lagano', name: 'Lagano', detail: 'za svakoga' },
  { id: 'srednje', name: 'Srednje', detail: 'za drugare' },
  { id: 'ljuto', name: 'Ljuto', detail: 'za bliske' },
]

export const PRVI_PROMPTS: PrviPrompt[] = [
  // Lagano: bezazleno, smešno i za ekipu koja se tek upoznaje.
  { id: 'l01', level: 'lagano', q: 'Ko bi prvi zaspao/la na žurci?', title: 'Kralj kauča' },
  { id: 'l02', level: 'lagano', q: 'Ko bi se prvi izgubio/la u sopstvenom gradu?', title: 'Kapetan Kompas' },
  { id: 'l03', level: 'lagano', q: 'Ko bi prvi pojeo/la tuđu hranu iz frižidera?', title: 'Noćni frižider-lovac' },
  { id: 'l04', level: 'lagano', q: 'Ko bi prvi zakasnio/la na avion?', title: 'Gospodar kašnjenja' },
  { id: 'l05', level: 'lagano', q: 'Ko bi prvi zaplakao/la na crtanom filmu?', title: 'Srce od šećera' },
  { id: 'l06', level: 'lagano', q: 'Ko bi prvi preživeo zombi apokalipsu?', title: 'Poslednji heroj' },
  { id: 'l07', level: 'lagano', q: 'Ko bi prvi pao u zombi apokalipsi?', title: 'Zombi mamac' },
  { id: 'l08', level: 'lagano', q: 'Ko bi prvi zaboravio/la pasoš kod kuće?', title: 'Profesor Zaborav' },
  { id: 'l09', level: 'lagano', q: 'Ko bi prvi zapevao/la u karaoke baru?', title: 'Glas nacije' },
  { id: 'l10', level: 'lagano', q: 'Ko bi prvi usvojio/la deset mačaka?', title: 'Mačji zaštitnik' },
  { id: 'l11', level: 'lagano', q: 'Ko bi prvi probao/la čudno jelo na putu?', title: 'Hrabri stomak' },
  { id: 'l12', level: 'lagano', q: 'Ko bi prvi zaspao/la u bioskopu?', title: 'Spavač iz poslednjeg reda' },
  { id: 'l13', level: 'lagano', q: 'Ko bi prvi otišao/la na izlet bez mape i plana?', title: 'Avanturista bez GPS-a' },
  { id: 'l14', level: 'lagano', q: 'Ko bi prvi izgubio/la telefon večeras?', title: 'Lovac na telefon' },
  { id: 'l15', level: 'lagano', q: 'Ko bi prvi počeo/la da igra na stolu?', title: 'Kralj podijuma' },
  { id: 'l16', level: 'lagano', q: 'Ko bi prvi ušao/la u hladno more?', title: 'Ledeni ratnik' },
  { id: 'l17', level: 'lagano', q: 'Ko bi se prvi sprijateljio/la sa konobarom?', title: 'Ambasador šanka' },
  { id: 'l18', level: 'lagano', q: 'Ko bi prvi zaboravio/la kako se zove hotel?', title: 'Izgubljeni turista' },
  { id: 'l19', level: 'lagano', q: 'Ko bi prvi naručio/la picu u tri ujutru?', title: 'Ponoćni gurman' },
  { id: 'l20', level: 'lagano', q: 'Ko bi prvi slikao/la hranu pre nego što je pojede?', title: 'Fotograf tanjira' },
  { id: 'l21', level: 'lagano', q: 'Ko bi prvi pobedio/la u igri na sreću?', title: 'Dete sreće' },
  { id: 'l22', level: 'lagano', q: 'Ko bi prvi pao/la sa bicikla?', title: 'Kaskader početnik' },
  { id: 'l23', level: 'lagano', q: 'Ko bi prvi zaboravio/la tuđi rođendan?', title: 'Kalendar od papira' },
  { id: 'l24', level: 'lagano', q: 'Ko bi prvi postao/la poznat/a na internetu?', title: 'Viralna zvezda' },
  { id: 'l25', level: 'lagano', q: 'Ko bi prvi pojeo/la ceo tanjir slatkiša?', title: 'Šećerni div' },
  { id: 'l26', level: 'lagano', q: 'Ko bi prvi otišao/la da spava večeras?', title: 'Princ/eza jastuka' },
  { id: 'l27', level: 'lagano', q: 'Ko bi prvi ostao/la budan/na do jutra?', title: 'Noćna ptica' },
  { id: 'l28', level: 'lagano', q: 'Ko bi prvi upao/la u fontanu?', title: 'Vodeni heroj' },
  { id: 'l29', level: 'lagano', q: 'Ko bi prvi pričao/la sa životinjama?', title: 'Šaptač životinjama' },
  { id: 'l30', level: 'lagano', q: 'Ko bi prvi izgubio/la ključeve apartmana?', title: 'Čuvar (ne)ključa' },

  // Srednje: za drugare koji se dobro znaju.
  { id: 's01', level: 'srednje', q: 'Ko bi prvi poslao/la poruku bivšem/bivšoj večeras?', title: 'Povratnik iz prošlosti' },
  { id: 's02', level: 'srednje', q: 'Ko bi prvi potrošio/la sav novac prvog dana puta?', title: 'Kapetan Kartica' },
  { id: 's03', level: 'srednje', q: 'Ko bi prvi zaboravio/la šta je radio/la sinoć?', title: 'Gospodar magle' },
  { id: 's04', level: 'srednje', q: 'Ko bi prvi upao/la u svađu sa strancem?', title: 'Ratnik bez razloga' },
  { id: 's05', level: 'srednje', q: 'Ko bi prvi izmislio/la izgovor da ne dođe na posao?', title: 'Majstor izgovora' },
  { id: 's06', level: 'srednje', q: 'Ko bi prvi postao/la milioner/ka?', title: 'Zlatni prst' },
  { id: 's07', level: 'srednje', q: 'Ko bi prvi spiskao/la milion za godinu dana?', title: 'Čarobnjak trošenja' },
  { id: 's08', level: 'srednje', q: 'Ko bi prvi uleteo/la u sliku tuđeg venčanja?', title: 'Nepozvani gost' },
  { id: 's09', level: 'srednje', q: 'Ko bi prvi zaspao/la u taksiju?', title: 'Putnik spavač' },
  { id: 's10', level: 'srednje', q: 'Ko bi prvi preuzeo/la DJ pult bez pitanja?', title: 'DJ Haos' },
  { id: 's11', level: 'srednje', q: 'Ko bi prvi zvao/la mamu posle prve noći?', title: 'Mamin heroj' },
  { id: 's12', level: 'srednje', q: 'Ko bi prvi rekao/la tajnu koju je obećao/la da čuva?', title: 'Živi radio' },
  { id: 's13', level: 'srednje', q: 'Ko bi prvi zaboravio/la ime osobe sa kojom priča?', title: 'Kako-beše-ime' },
  { id: 's14', level: 'srednje', q: 'Ko bi prvi okačio/la neprijatnu sliku na mreže?', title: 'Paparaco družine' },
  { id: 's15', level: 'srednje', q: 'Ko bi prvi završio/la u pogrešnom gradu?', title: 'Izgubljeni u prevodu' },
  { id: 's16', level: 'srednje', q: 'Ko bi prvi pristao/la na skok padobranom?', title: 'Neustrašivi' },
  { id: 's17', level: 'srednje', q: 'Ko bi prvi odustao/la od dijete posle sat vremena?', title: 'Kapetan Burek' },
  { id: 's18', level: 'srednje', q: 'Ko bi prvi ostavio/la telefon i živeo/la u šumi?', title: 'Gospodar divljine' },
  { id: 's19', level: 'srednje', q: 'Ko bi prvi kupio/la nešto glupo na putu?', title: 'Kralj suvenira' },
  { id: 's20', level: 'srednje', q: 'Ko bi prvi ušao/la u rijaliti?', title: 'Rijaliti zvezda' },
  { id: 's21', level: 'srednje', q: 'Ko bi prvi zaspao/la sa cipelama na nogama?', title: 'Spavač u čizmama' },
  { id: 's22', level: 'srednje', q: 'Ko bi prvi izgubio/la opkladu i morao/la da je ispuni?', title: 'Vitez opklade' },
  { id: 's23', level: 'srednje', q: 'Ko bi prvi ispričao/la isti vic treći put?', title: 'Pokvarena ploča' },
  { id: 's24', level: 'srednje', q: 'Ko bi se prvi zaljubio/la na odmoru?', title: 'Letnja romansa' },
  { id: 's25', level: 'srednje', q: 'Ko bi prvi zakasnio/la na sopstveno venčanje?', title: 'Mlada/Mladoženja u bekstvu' },
  { id: 's26', level: 'srednje', q: 'Ko bi prvi naručio/la turu za ceo lokal?', title: 'Velikodušni' },
  { id: 's27', level: 'srednje', q: 'Ko bi prvi pobegao/la od kuće sa cirkusom?', title: 'Cirkuski begunac' },
  { id: 's28', level: 'srednje', q: 'Ko bi prvi zaspao/la za vreme ove igre?', title: 'Tihi igrač' },
  { id: 's29', level: 'srednje', q: 'Ko bi prvi prodao/la drugare za sendvič?', title: 'Izdajnik od sendviča' },
  { id: 's30', level: 'srednje', q: 'Ko bi prvi postao/la gradonačelnik/ca?', title: 'Narodni vođa' },

  // Ljuto: lično, ali s ljubavlju. Za bliske drugare.
  { id: 'j01', level: 'ljuto', q: 'Ko bi prvi poljubio/la nekog iz ove sobe?', title: 'Srce od plamena' },
  { id: 'j02', level: 'ljuto', q: 'Ko bi prvi zaboravio/la na godišnjicu veze?', title: 'Romantik od kamena' },
  { id: 'j03', level: 'ljuto', q: 'Ko bi prvi čitao/la tuđe poruke?', title: 'Tajni agent' },
  { id: 'j04', level: 'ljuto', q: 'Ko bi prvi priznao/la simpatiju posle dva pića?', title: 'Hrabrost iz čaše' },
  { id: 'j05', level: 'ljuto', q: 'Ko bi prvi raskinuo/la porukom?', title: 'Hladni prst' },
  { id: 'j06', level: 'ljuto', q: 'Ko bi prvi završio/la u policiji posle žurke?', title: 'Neukrotivi' },
  { id: 'j07', level: 'ljuto', q: 'Ko bi prvi slagao/la o svojim godinama?', title: 'Večno mlad/a' },
  { id: 'j08', level: 'ljuto', q: 'Ko bi prvi imao/la tajni profil na mrežama?', title: 'Čovek sa maskom' },
  { id: 'j09', level: 'ljuto', q: 'Ko bi prvi zvao/la bivšeg/bivšu u tri ujutru?', title: 'Noćni pozivar' },
  { id: 'j10', level: 'ljuto', q: 'Ko bi se prvi venčao/la u Las Vegasu?', title: 'Brzi prsten' },
  { id: 'j11', level: 'ljuto', q: 'Ko bi prvi uvredio/la nečiju mamu na ručku?', title: 'Diplomata godine' },
  { id: 'j12', level: 'ljuto', q: 'Ko bi prvi ogovarao/la ostale čim izađu?', title: 'Zlatni jezik' },
  { id: 'j13', level: 'ljuto', q: 'Ko bi se prvi probudio/la pored nepoznate osobe?', title: 'Misterija jutra' },
  { id: 'j14', level: 'ljuto', q: 'Ko bi prvi ostavio/la partnera zbog boljeg posla?', title: 'Hladni strateg' },
  { id: 'j15', level: 'ljuto', q: 'Ko bi prvi izgubio/la živce u gužvi?', title: 'Vulkan' },
  { id: 'j16', level: 'ljuto', q: 'Ko bi prvi slagao/la da je bolestan/na zbog izlaska?', title: 'Lažni bolesnik' },
  { id: 'j17', level: 'ljuto', q: 'Ko bi prvi pogledao/la tuđi telefon dok spava?', title: 'Noćni špijun' },
  { id: 'j18', level: 'ljuto', q: 'Ko bi prvi flertovao/la sa konobarom/icom?', title: 'Šarmer šanka' },
  { id: 'j19', level: 'ljuto', q: 'Ko bi prvi pristao/la na dejt naslepo?', title: 'Slepi romantik' },
  { id: 'j20', level: 'ljuto', q: 'Ko bi prvi pobegao/la sa sopstvenog venčanja?', title: 'Odbegla zvezda' },
  { id: 'j21', level: 'ljuto', q: 'Ko bi prvi zaboravio/la dete u prodavnici?', title: 'Roditelj meseca' },
  { id: 'j22', level: 'ljuto', q: 'Ko bi prvi rekao/la nešto čega se sutra stidi?', title: 'Jutarnje kajanje' },
  { id: 'j23', level: 'ljuto', q: 'Ko bi prvi popio/la previše večeras?', title: 'Kapetan Čaša' },
  { id: 'j24', level: 'ljuto', q: 'Ko bi prvi ušao/la u vezu sa drugarovim bivšim?', title: 'Prelazni rok' },
  { id: 'j25', level: 'ljuto', q: 'Ko bi prvi poslao/la poruku pogrešnoj osobi?', title: 'Pogrešan primalac' },
  { id: 'j26', level: 'ljuto', q: 'Ko bi prvi napustio/la grupu zbog nove ljubavi?', title: 'Nestali u ljubavi' },
  { id: 'j27', level: 'ljuto', q: 'Ko bi prvi priznao/la najsramotniju tajnu?', title: 'Otvorena knjiga' },
  { id: 'j28', level: 'ljuto', q: 'Ko bi prvi zaplakao/la posle treće ture?', title: 'Plačljivi heroj' },
  { id: 'j29', level: 'ljuto', q: 'Ko bi prvi pokušao/la da vrati bivšu ljubav?', title: 'Večiti povratnik' },
  { id: 'j30', level: 'ljuto', q: 'Ko bi prvi postao/la tema tračeva u kraju?', title: 'Glavna vest' },
]

const BY_ID = new Map(PRVI_PROMPTS.map((p) => [p.id, p]))

/** A prompt by id; a stale id from an older version gets a harmless stand-in so a screen never crashes. */
export function getPrviPrompt(id: string): PrviPrompt {
  return BY_ID.get(id) ?? PRVI_PROMPTS[0]
}
