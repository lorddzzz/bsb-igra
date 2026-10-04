/**
 * Questions for Blef: a strange but true fact with a blank. Players invent fake answers for the blank,
 * then try to spot the real one. `alt` lists other spellings of the real answer, so nobody can
 * submit it as a fake. `fakes` are the house's own believable wrong answers.
 */
export interface BlefQuestion {
  id: string
  topic: 'svet' | 'muzika' | 'heroji' | 'gejming' | 'film' | 'zavicaj'
  /** The fact, with ___ where the answer goes. */
  q: string
  a: string
  alt?: string[]
  fakes: [string, string]
}

export const BLANK = '___'

export const BLEF_QUESTIONS: BlefQuestion[] = [
  // Svet: životinje
  { id: 's01', topic: 'svet', q: 'U Švajcarskoj je zakonom zabranjeno držati samo jedno ___, jer im je potrebno društvo.', a: 'zamorče', alt: ['zamorce', 'zamorca', 'morsko prase', 'morsko prasence'], fakes: ['zlatnu ribicu', 'papagaja'] },
  { id: 's02', topic: 'svet', q: 'Vombat pravi izmet u obliku ___.', a: 'kocke', alt: ['kocka', 'kockica', 'kockice'], fakes: ['zvezde', 'spirale'] },
  { id: 's03', topic: 'svet', q: 'Hobotnica ima tri ___.', a: 'srca', alt: ['srce'], fakes: ['stomaka', 'jezika'] },
  { id: 's04', topic: 'svet', q: 'Flamingosi su roze boje zbog ___ koje jedu.', a: 'račića', alt: ['racica', 'rakova', 'škampa', 'skampi', 'škampi', 'algi', 'alge', 'rakovi'], fakes: ['jagoda', 'crvenih bubica'] },
  { id: 's05', topic: 'svet', q: 'Morske vidre se dok spavaju drže za ___ da ne bi otplutale jedna od druge.', a: 'ruke', alt: ['šape', 'sape', 'ruku', 'šapu'], fakes: ['repove', 'brkove'] },
  { id: 's06', topic: 'svet', q: 'Kengur ne može da hoda ___.', a: 'unazad', alt: ['nazad', 'u nazad', 'rikverc'], fakes: ['po pesku', 'po mraku'] },
  { id: 's07', topic: 'svet', q: 'Mužjak pingvina partnerki kao prosidbeni poklon donosi ___.', a: 'kamenčić', alt: ['kamencic', 'kamen', 'kamičak', 'kamicak', 'kamenčiće', 'šljunak'], fakes: ['ribu', 'pero'] },
  { id: 's08', topic: 'svet', q: 'Krokodil ne može da ___.', a: 'isplazi jezik', alt: ['plazi jezik', 'isplazi', 'isplazi jezik napolje'], fakes: ['pliva unazad', 'kine'] },
  { id: 's09', topic: 'svet', q: 'Slon je jedan od retkih sisara koji ne može da ___.', a: 'skače', alt: ['skace', 'skoči', 'skoci', 'skakuće'], fakes: ['pliva', 'legne'] },
  { id: 's10', topic: 'svet', q: 'Na japanskom ostrvu Okunošima slobodno žive hiljade ___.', a: 'zečeva', alt: ['zeceva', 'zeca', 'zečića', 'kunića', 'kunica'], fakes: ['pingvina', 'kornjača'] },
  { id: 's11', topic: 'svet', q: 'Mačke ne mogu da osete ___ ukus.', a: 'sladak', alt: ['slatki', 'slatko', 'slatkiš'], fakes: ['kiseo', 'slan'] },
  { id: 's12', topic: 'svet', q: 'Koale imaju ___ skoro iste kao ljudi.', a: 'otiske prstiju', alt: ['otiske', 'otisci prstiju', 'otisak prsta', 'prste'], fakes: ['glasne žice', 'trepavice'] },
  { id: 's13', topic: 'svet', q: 'Zubi dabra su ___ boje, jer sadrže gvožđe.', a: 'narandžaste', alt: ['narandzaste', 'narandžasti', 'narandžasta', 'oranž', 'orange'], fakes: ['plave', 'crne'] },
  { id: 's14', topic: 'svet', q: 'Škampi imaju srce u ___.', a: 'glavi', alt: ['glava'], fakes: ['repu', 'nozi'] },
  { id: 's15', topic: 'svet', q: 'Leptiri osećaju ukus hrane ___.', a: 'nogama', alt: ['nogom', 'stopalima', 'nožicama', 'noge'], fakes: ['krilima', 'očima'] },
  { id: 's16', topic: 'svet', q: 'Lenjivac pod vodom može da zadrži dah čak ___.', a: '40 minuta', alt: ['40', 'četrdeset minuta', 'cetrdeset minuta', '40 min'], fakes: ['3 sata', 'dva dana'] },
  { id: 's17', topic: 'svet', q: 'Neke kornjače mogu da dišu na ___.', a: 'zadnjicu', alt: ['dupe', 'guzicu', 'guzu', 'zadnjica', 'anus'], fakes: ['uši', 'oklop'] },
  { id: 's18', topic: 'svet', q: 'Najbliži živi rođak tiranosaurusa je ___.', a: 'kokoška', alt: ['kokoska', 'kokoš', 'kokos', 'pile', 'piletina', 'kokoške', 'ptica', 'ptice'], fakes: ['gušter', 'iguana'] },
  { id: 's19', topic: 'svet', q: 'Norveška vojska je jednog pingvina proglasila ___.', a: 'vitezom', alt: ['vitez', 'ser', 'generalom', 'general', 'brigadirom', 'brigadir'], fakes: ['ministrom', 'sveštenikom'] },
  { id: 's20', topic: 'svet', q: 'Postoji vrsta meduze koja je praktično ___.', a: 'besmrtna', alt: ['besmrtan', 'besmrtni', 'neumrla'], fakes: ['vegetarijanac', 'leteća'] },
  { id: 's21', topic: 'svet', q: 'Na Novom Zelandu ima više ___ nego ljudi.', a: 'ovaca', alt: ['ovce', 'ovci'], fakes: ['kengura', 'koala'] },
  { id: 's22', topic: 'svet', q: 'Mačak Stabs je 20 godina bio počasni ___ jednog gradića na Aljasci.', a: 'gradonačelnik', alt: ['gradonacelnik', 'gradonačelnika', 'mer', 'načelnik'], fakes: ['šerif', 'poštar'] },
  { id: 's23', topic: 'svet', q: 'Sve do 2025. na Islandu nikada nisu viđeni ___.', a: 'komarci', alt: ['komaraca', 'komarac'], fakes: ['ovce', 'konji'] },
  { id: 's24', topic: 'svet', q: 'Nikola Tesla je bio zaljubljen u jednog belog ___.', a: 'goluba', alt: ['golub', 'golubicu', 'golubica'], fakes: ['mačka', 'konja'] },

  // Svet: hrana
  { id: 's25', topic: 'svet', q: 'U egipatskim grobnicama pronađen je ___ star 3000 godina, i dalje jestiv.', a: 'med', alt: ['meda', 'teglu meda'], fakes: ['sir', 'hleb'] },
  { id: 's26', topic: 'svet', q: 'Botanički gledano, banana je ___, a jagoda nije.', a: 'bobica', alt: ['bobice', 'jagodasti plod'], fakes: ['orašasti plod', 'mahunarka'] },
  { id: 's27', topic: 'svet', q: 'Kečap se 1830-ih u Americi prodavao kao ___.', a: 'lek', alt: ['lijek', 'lekovi', 'lek za stomak', 'lek za varenje', 'sirup'], fakes: ['boja za kosu', 'lepak'] },
  { id: 's28', topic: 'svet', q: 'Pica Margarita je dobila ime po italijanskoj ___.', a: 'kraljici', alt: ['kraljica', 'kraljici margariti'], fakes: ['glumici', 'pevačici'] },
  { id: 's29', topic: 'svet', q: 'Sendvič je dobio ime po jednom engleskom ___.', a: 'grofu', alt: ['grof', 'erlu', 'earlu', 'plemiću', 'lordu'], fakes: ['kuvaru', 'gusaru'] },
  { id: 's30', topic: 'svet', q: 'Sladoled na štapiću slučajno je izmislio ___ koji je ostavio sok napolju preko noći.', a: 'jedanaestogodišnji dečak', alt: ['dečak', 'decak', 'dete', 'klinac', '11-godišnji dečak', '11 godišnji dečak', 'jedanaestogodisnji decak'], fakes: ['poštar', 'zubar'] },
  { id: 's31', topic: 'svet', q: 'Ananasu treba oko ___ da poraste i sazri.', a: 'dve godine', alt: ['2 godine', 'dvije godine', 'godinu i po', 'godinu i pol'], fakes: ['šest meseci', 'tri nedelje'] },
  { id: 's32', topic: 'svet', q: 'Havajsku picu izmislio je jedan Grk u ___.', a: 'Kanadi', alt: ['kanada'], fakes: ['Australiji', 'Nemačkoj'] },
  { id: 's33', topic: 'svet', q: 'Šargarepe su prvobitno bile ___.', a: 'ljubičaste', alt: ['ljubicaste', 'ljubičasta', 'ljubičaste boje', 'lila'], fakes: ['plave', 'zelene'] },
  { id: 's34', topic: 'svet', q: 'Kikiriki uopšte nije orah, već ___.', a: 'mahunarka', alt: ['mahunarke', 'leguminoza', 'pasulj', 'grašak'], fakes: ['koren', 'bobica'] },
  { id: 's35', topic: 'svet', q: 'Stari Rimljani su prali veš ___.', a: 'urinom', alt: ['mokraćom', 'mokracom', 'pišakom', 'piškom', 'urin'], fakes: ['vinom', 'maslinovim uljem'] },

  // Svet: istorija i ljudi
  { id: 's36', topic: 'svet', q: 'Kleopatra je živela bliže vremenu prvog ___ nego gradnji Keopsove piramide.', a: 'iPhonea', alt: ['iphone', 'ajfona', 'ajfon', 'aj fona', 'mobilnog telefona', 'pametnog telefona'], fakes: ['aviona', 'automobila'] },
  { id: 's37', topic: 'svet', q: 'Najkraći rat u istoriji, između Britanije i Zanzibara, trajao je oko ___.', a: '40 minuta', alt: ['38 minuta', '45 minuta', '40', '38', '45', 'četrdeset minuta'], fakes: ['tri dana', 'šest sati'] },
  { id: 's38', topic: 'svet', q: 'Nacionalna životinja Škotske je ___.', a: 'jednorog', alt: ['jednorozac', 'jednorožac', 'unikorn'], fakes: ['los', 'orao'] },
  { id: 's39', topic: 'svet', q: 'Univerzitet u Oksfordu je stariji od carstva ___.', a: 'Asteka', alt: ['asteci', 'azteka'], fakes: ['Rimljana', 'Egipćana'] },
  { id: 's40', topic: 'svet', q: 'Nintendo je osnovan 1889. i prvo je pravio ___.', a: 'karte za igru', alt: ['karte', 'karte za igranje', 'kartu', 'igraće karte', 'igrace karte'], fakes: ['kišobrane', 'sapune'] },
  { id: 's41', topic: 'svet', q: 'Kraljica Elizabeta II je u Drugom svetskom ratu radila kao ___.', a: 'automehaničar', alt: ['mehaničar', 'mehanicar', 'automehanicar', 'vozač', 'vozac', 'vozač kamiona', 'vozačica', 'mehaničarka'], fakes: ['kuvarica', 'špijun'] },
  { id: 's42', topic: 'svet', q: 'Albertu Ajnštajnu je 1952. ponuđeno da postane predsednik ___.', a: 'Izraela', alt: ['izrael'], fakes: ['Švajcarske', 'Nemačke'] },
  { id: 's43', topic: 'svet', q: 'Pravi vikinški šlemovi nisu imali ___.', a: 'rogove', alt: ['roge', 'rog', 'rogovi'], fakes: ['gvožđe', 'kaiš'] },
  { id: 's44', topic: 'svet', q: 'Stari London Bridge je 1968. prodat i preseljen u ___.', a: 'Arizonu', alt: ['arizona', 'ameriku', 'amerika', 'sad', 'usa'], fakes: ['Dubai', 'Japan'] },
  { id: 's45', topic: 'svet', q: 'Reč „vampir” je u svetske jezike ušla iz ___ jezika.', a: 'srpskog', alt: ['srpski', 'srpskoga'], fakes: ['mađarskog', 'grčkog'] },
  { id: 's46', topic: 'svet', q: 'Kaže se da je Beograd kroz istoriju razaran i ponovo građen čak ___ puta.', a: '44', alt: ['četrdeset četiri', 'cetrdeset cetiri', '40', '38'], fakes: ['12', '100'] },
  { id: 's47', topic: 'svet', q: 'Mona Liza nema ___.', a: 'obrve', alt: ['obrva', 'obrvu', 'obrvi'], fakes: ['osmeh', 'kosu'] },
  { id: 's48', topic: 'svet', q: 'Prvi video ikad postavljen na YouTube snimljen je u ___.', a: 'zoološkom vrtu', alt: ['zoo vrtu', 'zoo', 'zoološkom', 'zooloskom vrtu', 'zoološki vrt', 'zoo vrt'], fakes: ['kupatilu', 'kafani'] },

  // Svet: nauka i svemir
  { id: 's49', topic: 'svet', q: 'Ajfelova kula je leti viša za oko ___, jer se metal širi na toploti.', a: '15 centimetara', alt: ['15 cm', '15', 'petnaest centimetara', '15 santi', '15 centi'], fakes: ['2 metra', '1 milimetar'] },
  { id: 's50', topic: 'svet', q: 'Na Veneri je jedan dan duži od jedne ___.', a: 'godine', alt: ['godina', 'venerine godine'], fakes: ['decenije', 'večnosti'] },
  { id: 's51', topic: 'svet', q: 'Australija je šira od ___.', a: 'Meseca', alt: ['mesec', 'mjeseca', 'mjesec'], fakes: ['Marsa', 'Kine'] },
  { id: 's52', topic: 'svet', q: 'Zalazak sunca na Marsu je ___ boje.', a: 'plave', alt: ['plav', 'plava', 'plavi', 'plavičaste'], fakes: ['zelene', 'ljubičaste'] },
  { id: 's53', topic: 'svet', q: 'Rusija ima veću površinu od ___.', a: 'Plutona', alt: ['pluton'], fakes: ['Merkura', 'Meseca'] },

  // Muzika
  { id: 'm01', topic: 'muzika', q: 'Pesma „Bohemian Rhapsody” grupe Queen nema ___.', a: 'refren', alt: ['refrena', 'refreni'], fakes: ['bubnjeve', 'gitaru'] },
  { id: 'm02', topic: 'muzika', q: 'Radni naziv Bitlsove pesme „Yesterday” bio je „___”.', a: 'Kajgana', alt: ['scrambled eggs', 'kajgane', 'jaja', 'umućena jaja'], fakes: ['Juče ujutru', 'Doručak'] },
  { id: 'm03', topic: 'muzika', q: 'Fredi Merkjuri je imao četiri viška ___.', a: 'zuba', alt: ['zub', 'zube', 'zubi'], fakes: ['prsta', 'rebra'] },
  { id: 'm04', topic: 'muzika', q: 'Bruno Mars je nadimak Bruno dobio po slavnom ___.', a: 'rvaču', alt: ['rvacu', 'rvač', 'rvac', 'hrvaču'], fakes: ['bokseru', 'psu'] },
  { id: 'm05', topic: 'muzika', q: 'Prvi video na YouTube-u sa milijardu pregleda bio je „___”.', a: 'Gangnam Style', alt: ['gangnam', 'gangnam stajl', 'gangam style', 'gangnamstyle'], fakes: ['Baby', 'Despacito'] },
  { id: 'm06', topic: 'muzika', q: 'Viktorija Bekam je u grupi Spice Girls bila poznata kao ___ Spice.', a: 'Posh', alt: ['posh spice', 'poš'], fakes: ['Fancy', 'Classy'] },
  { id: 'm07', topic: 'muzika', q: 'Ime grupe *NSYNC nastalo je od poslednjih ___ imena članova.', a: 'slova', alt: ['slovo', 'slogova', 'slog'], fakes: ['brojeva', 'reči'] },
  { id: 'm08', topic: 'muzika', q: 'Kao deca, Britni Spirs, Džastin Timberlejk i Kristina Agilera nastupali su zajedno u TV emisiji ___.', a: 'Miki Maus klub', alt: ['mickey mouse club', 'miki maus', 'mikimaus klub', 'mikija mausa', 'miki mausa', 'diznijev klub'], fakes: ['Ulica Sezam', 'Pokemon šou'] },
  { id: 'm09', topic: 'muzika', q: 'Lejdi Gaga je umetničko ime uzela iz jedne pesme grupe ___.', a: 'Queen', alt: ['kvin', 'kuin'], fakes: ['ABBA', 'Bitls'] },
  { id: 'm10', topic: 'muzika', q: 'Elvis Prisli je prirodno bio ___, a kosu je farbao u crno.', a: 'plavokos', alt: ['plav', 'plavuša', 'plavusa', 'svetle kose', 'plave kose', 'smeđ', 'smeđe kose'], fakes: ['riđ', 'ćelav'] },
  { id: 'm11', topic: 'muzika', q: 'Majkl Džekson je imao šimpanzu po imenu ___.', a: 'Babls', alt: ['bubbles', 'bables', 'bubls', 'bablz'], fakes: ['Čita', 'Koko'] },
  { id: 'm12', topic: 'muzika', q: 'Mocart je svoju prvu simfoniju napisao sa samo ___ godina.', a: '8', alt: ['osam', 'osam godina', '8 godina'], fakes: ['15', '21'] },
  { id: 'm13', topic: 'muzika', q: 'Melodija pesme „Srećan rođendan” prvo je bila pesma za dobro ___.', a: 'jutro', alt: ['jutra', 'jutru'], fakes: ['veče', 'zdravlje'] },
  { id: 'm14', topic: 'muzika', q: 'Kada je Srbija 2007. pobedila na Evroviziji sa „Molitvom”, takmičenje je održano u ___.', a: 'Helsinkiju', alt: ['helsinki', 'finskoj', 'finska'], fakes: ['Kijevu', 'Atini'] },
  { id: 'm15', topic: 'muzika', q: 'Hit „I Want It That Way” napisali su autori iz ___, pa stihovi nemaju mnogo smisla.', a: 'Švedske', alt: ['svedske', 'švedska', 'svedska', 'šveđani'], fakes: ['Irske', 'Kanade'] },

  // Heroji i fantastika
  { id: 'h01', topic: 'heroji', q: 'Tolkin je prvu rečenicu „Hobita” napisao na praznoj strani ___ koji je ocenjivao.', a: 'ispitnog rada', alt: ['ispitnog zadatka', 'ispita', 'studentskog rada', 'rada', 'testa', 'ispitnog testa'], fakes: ['računa iz kafane', 'ljubavnog pisma'] },
  { id: 'h02', topic: 'heroji', q: 'Dž. K. Rouling je ime Hogvortsa, kaže, nesvesno uzela od jedne vrste ___.', a: 'ljiljana', alt: ['ljiljan', 'cveta', 'cveća', 'biljke', 'cvet'], fakes: ['sira', 'pastrmke'] },
  { id: 'h03', topic: 'heroji', q: 'Pikaču je prvobitno trebalo da ima i drugi stadijum evolucije po imenu ___.', a: 'Gorošu', alt: ['gorochu', 'gorocu', 'goroču'], fakes: ['Pikazam', 'Rajču Prajm'] },
  { id: 'h04', topic: 'heroji', q: 'Robert Dauni Džunior je na snimanju filmova o Ajron Menu po celom setu krio ___, pa je jeo i usred scena.', a: 'hranu', alt: ['grickalice', 'užinu', 'uzinu', 'hrana', 'klopu', 'jelo', 'sendviče', 'sendvice'], fakes: ['cigarete', 'scenario'] },
  // Gejming
  { id: 'g01', topic: 'gejming', q: 'Pionirska igra „Pong” iz 1972. godine tako se zvala jer je „Ping-Pong” već bio zaštićeni ___.', a: 'žig', alt: ['zig', 'zaštitni znak', 'zastitni znak', 'brend', 'naziv', 'trademark'], fakes: ['ime bara', 'naziv flipera'] },
  { id: 'g02', topic: 'gejming', q: 'Ime Super Marija potiče od ___ skladišta koje je Nintendo of America iznajmljivao.', a: 'vlasnika', alt: ['gazde', 'stanodavca', 'vlasnik', 'zakupodavca'], fakes: ['čuvara', 'kuvara'] },
  { id: 'g03', topic: 'gejming', q: 'Omiljeno oružje igrača u „Half-Life” igrama je običan ___.', a: 'pajser', alt: ['poluga', 'ćuskija', 'cuskija', 'metalna poluga', 'gvozdena poluga'], fakes: ['ključ', 'čekić'] },
  { id: 'g04', topic: 'gejming', q: 'Kriper iz „Minecrafta” nastao je greškom, dok je autor pokušavao da napravi ___.', a: 'svinju', alt: ['svinja', 'prase', 'svinje'], fakes: ['zombija', 'kaktus'] },
  // Film i serije
  { id: 'f01', topic: 'film', q: 'Zvuk svetlosnog mača u „Ratovima zvezda” napravljen je od brujanja ___ i starog televizora.', a: 'projektora', alt: ['projektor', 'filmskog projektora', 'motora projektora'], fakes: ['frižidera', 'usisivača'] },
  { id: 'f02', topic: 'film', q: 'Ajkula u filmu „Ajkula” se stalno kvarila, pa se retko vidi. Ekipa ju je zvala ___.', a: 'Brus', alt: ['bruce', 'brusom'], fakes: ['Džordž', 'Debeli Hari'] },
  { id: 'f03', topic: 'film', q: 'U seriji „Prijatelji” svih šest glumaca je u poslednjim sezonama zarađivalo po ___ dolara po epizodi.', a: 'milion', alt: ['1.000.000', '1000000', '1 milion', 'milion dolara', 'jedan milion'], fakes: ['250.000', '600.000'] },
  { id: 'f04', topic: 'film', q: 'U filmu „Ko to tamo peva” pevačku grupu koja se javlja kroz ceo film čine dva ___.', a: 'Roma', alt: ['Cigana', 'Cigani', 'Romi', 'ciganina', 'cigana'], fakes: ['brata', 'zatvorenika'] },
  // Zavičaj: Kruševac, Zemun i Beograd
  { id: 'z01', topic: 'zavicaj', q: 'Kula na Gardošu u Zemunu podignuta je 1896. godine u čast ___ godina od dolaska Mađara u Panoniju.', a: '1000', alt: ['hiljadu', 'hiljadu godina', '1.000', 'milenijum'], fakes: ['500', '300'] },
  { id: 'z02', topic: 'zavicaj', q: 'Knez Lazar je Kruševac sagradio kao svoju prestonicu, pa se grad i danas zove ___ grad.', a: 'Carski', alt: ['carski', 'car lazarev', 'lazarev'], fakes: ['Kneževski', 'Vinogradarski'] },
  { id: 'z03', topic: 'zavicaj', q: 'Spomenik Pobednik na Kalemegdanu prvo je trebalo da stoji na Terazijama, ali je premešten jer je građane bunilo što je ___.', a: 'go', alt: ['nag', 'golišav', 'bez odeće', 'nagi', 'goli'], fakes: ['previsok', 'okrenut ka Austriji'] },
  { id: 'z04', topic: 'zavicaj', q: 'Zemun je do 1918. pripadao Austrougarskoj, a od Beograda ga je delila granica na reci ___.', a: 'Savi', alt: ['sava'], fakes: ['Dunavu', 'Tisi'] },
]

export function getBlefQuestion(id: string): BlefQuestion {
  return BLEF_QUESTIONS.find((q) => q.id === id) ?? BLEF_QUESTIONS[0]
}
