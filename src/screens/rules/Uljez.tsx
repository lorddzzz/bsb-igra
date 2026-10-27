export function UljezRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> pronađi uljeza. A ako si ti uljez, ne daj da te provale.
      </p>
      <ol>
        <li>Neko bira kategoriju. Svi dobijaju istu tajnu reč, osim uljeza, koji zna samo kategoriju.</li>
        <li>Uljeza je obično oko petine igrača, ponekad više, a retko čak pola (troje uvek ima jednog). Niko ne zna koliko ih je.</li>
        <li>Idete u krug dva puta i svako kaže po jednu reč kao trag.</li>
        <li>Svi glasaju na telefonu ko je uljez. Možeš da glasaš za jednu ili dve osobe.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+1</b> za svaki tvoj glas koji pogodi uljeza
        </li>
        <li>
          uljez: <b>+2</b> ako ga ne uhvate, plus <b>+1</b> za svaki promašen glas (najviše +4)
        </li>
        <li>
          <b>+2</b> uljezu ako ga uhvate (većina glasa za njega), a on pogodi reč
        </li>
      </ul>
    </div>
  )
}
