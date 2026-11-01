export function PrviRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> glasaj kao ekipa. Bez mnogo razmišljanja, samo iskreno.
      </p>
      <ol>
        <li>Svi vide isto pitanje, npr. „Ko bi prvi zaspao/la na žurci?”</li>
        <li>Tajno glasaš za drugara koji najviše odgovara. Možeš glasati i za sebe.</li>
        <li>Kad svi glasaju, vidi se ko je za koga glasao.</li>
        <li>Ko dobije najviše glasova, nosi titulu pitanja do kraja večeri.</li>
        <li>Igra ima 10 pitanja.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+1</b> ako glasaš za onoga ko dobije najviše glasova (kod nerešenog, za bilo kog od njih)
        </li>
        <li>ako svako dobije po jedan glas, nema većine: niko ne dobija poen ni titulu</li>
      </ul>
    </div>
  )
}
