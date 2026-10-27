import { ROLES, SIDE_NAME, SPECIAL_ORDER } from '../../misija/logic'

export function MisijaRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> ekipa želi 3 uspešne misije, špijuni 3 sabotirane. Pobeđuje cela strana.
      </p>
      <ol>
        <li>Svako dobija tajnu ulogu (drži kartu da je vidiš). Špijuni znaju jedni druge, ekipa ne zna ništa.</li>
        <li>Vođa (menja se posle svakog predloga) bira tim za misiju. Pričajte, ubeđujte, sumnjajte!</li>
        <li>Svi glasaju za ili protiv tima. Treba više od pola „za”, inače sledeći vođa predlaže.</li>
        <li>Peti predlog za istu misiju ide bez glasanja.</li>
        <li>Tim tajno igra kartu: ekipa uvek Uspeh, špijun može Sabotažu. Jedna sabotaža obara misiju.</li>
        <li>Sa 7 i više igrača, 4. misiju obaraju tek 2 sabotaže.</li>
      </ol>
      <h3>Specijalne uloge</h3>
      <p className="muted">Domaćin bira koliko ih ima (0 do 5). Uvek dolaze ovim redom:</p>
      <ul className="points">
        {SPECIAL_ORDER.map((r) => (
          <li key={r}>
            {ROLES[r].icon} <b>{ROLES[r].name}</b> ({SIDE_NAME[ROLES[r].side]}): {ROLES[r].text}
          </li>
        ))}
      </ul>
      <p className="muted">
        Kad je Vidovnjak u igri i ekipa pobedi, špijuni se otkrivaju i jednom pogađaju ko je Vidovnjak. Pogodak im
        donosi pobedu.
      </p>
    </div>
  )
}
