export function TihaRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> vas dvoje ste jedna ekipa protiv misije. Odigrajte karte tako da svaki zadatak bude ispunjen.
      </p>
      <p>Imate 3 života. Propala misija odnosi jedan život, uspela vas vodi na težu. Igra se u dvoje.</p>
      <ul className="points">
        <li>Svako dobija 12 karata. Sedam karata ostaje van igre i niko ne zna koje su, do kraja misije.</li>
        <li>Igra se na štihove: kapetan baca kartu, drugi odgovara. Mora boja koju je kapetan bacio, ako je imaš.</li>
        <li>Veća karta iste boje nosi štih. Adut ⚡ nosi štih od svake boje. Ko nosi štih, taj baca sledeću kartu.</li>
        <li>
          Pre igre birate zadatke. Kapetan uzima prvi, pa naizmenično, dok se svi ne razdele. Zadatak može biti da
          osvojiš određenu kartu, da osvojiš tačno toliko štihova ili poslednji štih. „Prvi“ i „poslednji“ određuju
          redosled.
        </li>
        <li>Misija uspeva čim su svi zadaci gotovi, a propada čim jedan postane nemoguć.</li>
        <li>Jedan signal po igraču u misiji: pokaži kartu kao najvišu, najnižu ili jedinu svoje boje. Adut se ne pokazuje.</li>
        <li>Kapetan se menja svake misije.</li>
        <li>
          <b>Bez priče. Samo karte.</b>
        </li>
      </ul>
    </div>
  )
}
