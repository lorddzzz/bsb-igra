export function TalasRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> budite na istoj talasnoj dužini.
      </p>
      <ol>
        <li>Svake runde jedan igrač daje trag. Bira jednu od dve skale, npr. „hladno ↔ vruće”.</li>
        <li>Samo on vidi gde je na skali tajna meta, i napiše kratak trag, npr. „supa”.</li>
        <li>Ostali na svom telefonu pomeraju iglu tamo gde misle da je meta, pa je zaključaju.</li>
        <li>Svako daje trag dva puta, pa je igra gotova.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>4</b> za pun pogodak, <b>3</b> ili <b>2</b> ako si blizu
        </li>
        <li>davalac traga dobija koliko i najbolji pogodak te runde</li>
      </ul>
    </div>
  )
}
