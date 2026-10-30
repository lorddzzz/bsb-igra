import { useState, type CSSProperties, type ReactNode } from 'react'
import { ALL_BADGES, type Badge as BadgeData, type Player, type Pub } from '../game/types'

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
  const [failed, setFailed] = useState(false)
  return (
    <>
    <button
      className={`btn btn-${variant}${small ? ' btn-small' : ''}`}
      disabled={disabled || busy}
      onClick={async () => {
        if (!onClick) return
        setBusy(true)
        setFailed(false)
        try {
          await onClick()
        } catch {
          setFailed(true)
        } finally {
          setBusy(false)
        }
      }}
    >
      {children}
    </button>
    {failed && <p className="error" role="alert">Potez nije uspeo. Proveri vezu i probaj ponovo.</p>}
    </>
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
