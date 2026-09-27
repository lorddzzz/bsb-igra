import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { getCategory } from '../data/words'
import { BADGES, type Player, type Pub, type Ticket as TicketData } from '../game/types'

export function badgeOf(id: string | undefined) {
  return BADGES.find((b) => b.id === id) ?? BADGES[0]
}

export function Badge({ id, size = 'md' }: { id: string | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const b = badgeOf(id)
  return (
    <span className={`badge badge-${size}`} style={{ '--c': b.color } as CSSProperties} aria-label={b.name}>
      {b.name.length <= 2 ? b.name : b.name[0]}
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

/** Boarding-pass ticket. Press and hold to see your word; it hides the moment you let go. */
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
            <span className="airline">ULJEZ AIRLINES</span>
            <span className="flight">LET BSB-{String(round).padStart(2, '0')}</span>
          </div>
          <div className="ticket-mid">
            <div className="ticket-field">
              <small>PUTNIK</small>
              <b>{player?.name ?? '—'}</b>
            </div>
            <div className="ticket-field">
              <small>SEDIŠTE</small>
              <b className="seat">
                <Badge id={badge.id} size="sm" /> {badge.name}
              </b>
            </div>
            <div className="ticket-field">
              <small>KAPIJA</small>
              <b>{category?.icon ?? '✈️'}</b>
            </div>
          </div>
          <div className="perforation" />
          <div className="ticket-hold">{ready ? '👆 DRŽI DA VIDIŠ KARTU' : 'Karta se štampa…'}</div>
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
        <li>Svake runde ima 1 ili 2 uljeza (2 samo kad vas je bar četvoro). Niko ne zna koliko.</li>
        <li>Idete u krug dva puta i svako kaže po jednu reč kao trag.</li>
        <li>Svi glasaju na telefonu ko je uljez. Možeš da glasaš za jednu ili dve osobe.</li>
      </ol>
      <h3>Poeni</h3>
      <ul className="points">
        <li>
          <b>+1</b> za svaki tvoj glas koji pogodi uljeza
        </li>
        <li>
          uljez: <b>+2</b> ako ga ne uhvate, plus <b>+1</b> za svaki promašen glas
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
