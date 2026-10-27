import { CARDS, SPECIALS } from '../../kviz/cards'

export function KvizRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> znaj najviše, i to brzo.
      </p>
      <ol>
        <li>Svi dobijaju isto pitanje u isto vreme, sa 4 ponuđena odgovora.</li>
        <li>Imate 10 sekundi. Jedan dodir zaključava odgovor.</li>
        <li>Posle svakog pitanja vidi se tačan odgovor i ko je šta izabrao, pa odmah sledeće.</li>
        <li>Igra ima 15 pitanja iz šest oblasti: heroji i fantastika, gejming, film i serije, Kruševac, Zemun i Beograd, srpska istorija i Srbija danas.</li>
        <li>Većina pitanja je laka, nekoliko je teže, a jedno ili dva su baš teška 🔥.</li>
      </ol>
      <h3>Džokeri za napad</h3>
      <ul>
        <li>Svako počinje sa 2 nasumična džokera. Posle 5. i 10. pitanja poslednji na tabeli dobija još jedan.</li>
        <li>Tokom pitanja dodirni džoker pa drugara koji još nije odgovorio. Napad ga pogađa odmah.</li>
        <li>Najviše jedan džoker po pitanju, i svako može da nosi samo jedan napad u isto vreme.</li>
      </ul>
      <ul className="points">
        {CARDS.map((c) => (
          <li key={c.id}>
            {c.icon} <b>{c.name}</b>: {c.effect}
          </li>
        ))}
      </ul>
      <h3>Specijalne runde</h3>
      <ul className="points">
        {Object.values(SPECIALS).map((sp) => (
          <li key={sp.name}>
            {sp.icon} <b>{sp.name}</b>: {sp.text}
          </li>
        ))}
      </ul>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+1</b> za tačan odgovor
        </li>
        <li>brzina ne donosi poene, samo da stigneš na vreme</li>
      </ul>
    </div>
  )
}
