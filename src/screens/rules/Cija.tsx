export function CijaRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> saznaj nešto novo o drugarima i pogodi čiji je koji odgovor.
      </p>
      <ol>
        <li>Svi dobiju isto lično pitanje i anonimno napišu kratak odgovor.</li>
        <li>Odgovori se pomešaju i pojave kao A, B, C…</li>
        <li>Svako razvrsta tuđe odgovore: dodirni odgovor, pa drugara za koga misliš da je autor.</li>
        <li>Na kraju se otkrije ko je autor kojeg odgovora.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+1</b> za svaki odgovor koji pripišeš pravom drugaru
        </li>
        <li>
          <b>+1</b> za svakog drugara koji pogreši za tvoj odgovor, najviše pola igrača po odgovoru
        </li>
      </ul>
      <p>Odgovori koji su zanimljivi, ali ne i nemogući za pogoditi, donose najviše.</p>
    </div>
  )
}
