export function BlefRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> prevari drugare izmišljenim odgovorom, a ti pronađi pravi.
      </p>
      <ol>
        <li>Stiže čudna, ali istinita činjenica kojoj fali jedna reč.</li>
        <li>Svako na telefonu napiše lažan odgovor koji zvuči istinito.</li>
        <li>Pojave se svi odgovori: tvoje laži, pravi odgovor i po neka laž kuće.</li>
        <li>Izaberi odgovor za koji misliš da je istina.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+2</b> ako pronađeš pravi odgovor
        </li>
        <li>
          <b>+1</b> za svakog drugara koji izabere tvoju laž
        </li>
        <li>
          <b>×2</b> na poslednjem, osmom pitanju
        </li>
      </ul>
    </div>
  )
}
