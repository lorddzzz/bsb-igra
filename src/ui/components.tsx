import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { getCategory } from '../data/words'
import { CARDS, SPECIALS } from '../kviz/cards'
import { ALL_BADGES, type Badge as BadgeData, type Player, type Pub, type Ticket as TicketData } from '../game/types'

export function badgeOf(id: string | undefined) {
  return ALL_BADGES.find((b) => b.id === id) ?? ALL_BADGES[0]
}

/** What goes inside a badge circle: the icon, or the member's initials. */
export function badgeMark(b: BadgeData): string {
  return b.icon ?? (b.name.length <= 2 ? b.name : b.name[0])
}

export function Badge({ id, size = 'md' }: { id: string | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const b = badgeOf(id)
  return (
    <span className={`badge badge-${size}`} style={{ '--c': b.color } as CSSProperties} aria-label={b.name}>
      {badgeMark(b)}
    </span>
  )
}

export function PlayerTag({ player, you, extra }: { player: Player | undefined; you?: boolean; extra?: ReactNode }) {
  if (!player) return <span className="player-tag muted">Neko</span>
  return (
    <span className="player-tag">
      <Badge id={player.badge} size="sm" />
      <span className="player-name" style={{ color: badgeOf(player.badge).color }}>
        {player.name}
      </span>
      {you && <span className="you">ti</span>}
      {extra}
    </span>
  )
}

export function nameOf(pub: Pub, uid: string | undefined): string {
  return (uid && pub.players?.[uid]?.name) || 'Neko'
}

/** One-line tip shown only in the first round, so newcomers learn by playing. */
export function Hint({ pub, children }: { pub: Pub; children: ReactNode }) {
  if (pub.round > 1) return null
  return (
    <div className="hint">
      <span className="hint-icon">💡</span>
      <span>{children}</span>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  small,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'pink'
  disabled?: boolean
  small?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className={`btn btn-${variant}${small ? ' btn-small' : ''}`}
      disabled={disabled || busy}
      onClick={async () => {
        if (!onClick) return
        setBusy(true)
        try {
          await onClick()
        } finally {
          setBusy(false)
        }
      }}
    >
      {children}
    </button>
  )
}

export function Waiting({ children }: { children: ReactNode }) {
  return (
    <div className="waiting">
      <span className="dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>{children}</span>
    </div>
  )
}

/** Secret dossier. Press and hold to see your word; it hides the moment you let go. */
export function Ticket({ ticket, player, round }: { ticket: TicketData | null; player: Player | undefined; round: number }) {
  const [peek, setPeek] = useState(false)
  useEffect(() => {
    const hide = () => setPeek(false)
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [])
  const ready = ticket && ticket.round === round
  const category = ready ? getCategory(ticket.category) : null
  const badge = badgeOf(player?.badge)

  return (
    <div
      className={`ticket${peek && ready ? ' peek' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        setPeek(true)
      }}
      onPointerUp={() => setPeek(false)}
      onPointerCancel={() => setPeek(false)}
      onPointerLeave={() => setPeek(false)}
      onContextMenu={(e) => e.preventDefault()}
      role="button"
      aria-label="Drži da vidiš svoju kartu"
    >
      <div className="ticket-inner">
        <div className="ticket-face ticket-front">
          <div className="ticket-top">
            <span className="airline">DOSIJE ULJEZ</span>
            <span className="flight">SLUČAJ #{String(round).padStart(2, '0')}</span>
          </div>
          <div className="ticket-mid">
            <div className="ticket-field">
              <small>AGENT</small>
              <b>{player?.name ?? '—'}</b>
            </div>
            <div className="ticket-field">
              <small>HEROJ</small>
              <b className="seat">
                <Badge id={badge.id} size="sm" /> {badge.name}
              </b>
            </div>
            <div className="ticket-field">
              <small>FASCIKLA</small>
              <b>{category?.icon ?? '📁'}</b>
            </div>
          </div>
          <div className="perforation" />
          <div className="ticket-hold">{ready ? '👆 DRŽI DA OTVORIŠ DOSIJE' : 'Dosije se sprema…'}</div>
          <div className="barcode" aria-hidden />
        </div>
        <div className="ticket-face ticket-back">
          {ready && (
            <>
              <small className="ticket-cat">
                {category?.icon} {category?.name}
              </small>
              {ticket.word ? (
                <div className="ticket-word">{ticket.word}</div>
              ) : (
                <div className="ticket-word impostor">
                  TI SI ULJEZ <span>🤫</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Zatvori">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Rules() {
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

/** Opens the share sheet with the room link, or copies it where sharing isn't available. */
export function ShareButton({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}${location.pathname}?soba=${code}`
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text: `Uđi u sobu ${code}`, url: link })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
      }
    } catch {
      /* share sheet closed */
    }
  }
  return (
    <Button variant="ghost" small onClick={share}>
      {copied ? 'Link kopiran ✓' : '📲 Pošalji link drugarima'}
    </Button>
  )
}

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

export function WaveRules() {
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

export function LicRules() {
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
