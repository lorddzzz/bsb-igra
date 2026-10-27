export function LicitacijaRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> skupi više poena od drugara, tajnim ponudama. Igra se u dvoje.
      </p>
      <ol>
        <li>Svako ima iste karte za licitaciju, od 1 do 13, i svaku može da iskoristi samo jednom.</li>
        <li>Svake runde na sto izlazi jedna nagradna karta: od +1 do +10, ili kazna −1, −2, −3.</li>
        <li>Oboje tajno izaberete kartu. Kad oboje zaključate, karte se otkrivaju.</li>
        <li>
          Za nagradu: <b>veća</b> karta uzima poene. Za kaznu: <b>manja</b> karta dobija kaznu.
        </li>
        <li>Iste karte? Niko ne dobija ništa, a nagrada ostaje na stolu i dodaje se sledećoj rundi.</li>
        <li>Igra traje 13 rundi. Uvek vidiš koje karte drugaru još nisu potrošene.</li>
      </ol>
      <h3>Meč</h3>
      <ul className="points">
        <li>igra se na dve dobijene igre (najbolji u tri)</li>
        <li>nerešena igra se ne računa, igra se ponovo</li>
      </ul>
    </div>
  )
}
