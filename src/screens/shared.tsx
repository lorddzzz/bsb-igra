import { useEffect, useRef, type ReactNode } from 'react'
import { asList, playerOrder, standings } from '../game/logic'
import { MIN_PLAYERS, type Pub } from '../game/types'
import { Badge, Button, nameOf, PlayerTag, ShareButton, Waiting } from '../ui/components'
import * as sound from '../ui/sound'

/** Room code, players and a short how-to; the host starts the game. Used by Blef and Talasna dužina. */
export function PartyLobby({
  pub,
  me,
  isHost,
  code,
  title,
  steps,
  onKick,
  onStart,
  min = MIN_PLAYERS,
  children,
}: {
  pub: Pub
  me: string
  isHost: boolean
  code: string
  title: string
  steps: ReactNode[]
  onKick: (uid: string) => void
  onStart: () => void
  /** Fewest players the game can start with. */
  min?: number
  /** Game settings, shown above the start button. */
  children?: ReactNode
}) {
  const order = playerOrder(pub)
  const missing = Math.max(0, min - order.length)
  return (
    <section className="screen">
      <div className="card center">
        <small className="label">{title.toUpperCase()} · SOBA</small>
        <div className="room-code chrome">{code}</div>
        <ShareButton title={title} code={code} />
      </div>

      <div className="card">
        <h2>Putnici ({order.length})</h2>
        <ul className="player-list">
          {order.map((uid) => (
            <li key={uid}>
              <PlayerTag
                player={pub.players?.[uid]}
                you={uid === me}
                extra={uid === pub.hostUid ? <span className="host-tag">domaćin</span> : null}
              />
              {isHost && uid !== me && (
                <button className="icon-btn" onClick={() => onKick(uid)} aria-label="Izbaci">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Ukratko</h2>
        <ol className="blef-steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {children}

      {isHost ? (
        <Button disabled={missing > 0} onClick={onStart}>
          {missing > 0 ? `Treba još ${missing} ${missing === 1 ? 'igrač' : 'igrača'}` : 'Poleći! Počni igru ✈️'}
        </Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene igru</Waiting>
      )}
    </section>
  )
}

/** Who has already done this step, as a row of badges. */
export function DoneRow({
  pub,
  done,
  label,
  among,
}: {
  pub: Pub
  done: Record<string, unknown>
  label: string
  among?: string[]
}) {
  const order = among ?? playerOrder(pub)
  const count = order.filter((uid) => done[uid] !== undefined).length
  return (
    <>
      <div className="voted-row">
        {order.map((uid) => (
          <span key={uid} className={done[uid] !== undefined ? 'voted' : 'not-voted'}>
            <Badge id={pub.players?.[uid]?.badge} size="sm" />
          </span>
        ))}
      </div>
      <small className="muted">
        {label} {count} od {order.length}
      </small>
    </>
  )
}

/** This round's points per player, with reasons. */
export function RoundGains({
  pub,
  me,
  title,
  gains,
}: {
  pub: Pub
  me: string
  title: string
  gains: Record<string, { points: number; reasons?: string[] }>
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <ul className="gains">
        {playerOrder(pub).map((uid) => {
          const g = gains[uid]
          return (
            <li key={uid}>
              <PlayerTag player={pub.players?.[uid]} you={uid === me} />
              <span className="reasons">{asList<string>(g?.reasons).join(', ') || '—'}</span>
              <b className={g?.points ? 'plus' : 'zero'}>+{g?.points ?? 0}</b>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Score table with bars relative to the leader. */
export function ScoreTable({ pub, me }: { pub: Pub; me: string }) {
  const table = standings(pub)
  const top = Math.max(1, table[0]?.score ?? 0)
  return (
    <div className="card">
      <h2>Tabela</h2>
      <ol className="standings">
        {table.map((r) => (
          <li key={r.uid}>
            <PlayerTag player={pub.players?.[r.uid]} you={r.uid === me} />
            <span className="bar">
              <span style={{ width: `${(r.score / top) * 100}%` }} />
            </span>
            <b>{r.score}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Crown, winners and final table; fanfare on the host phone. */
export function Winner({
  pub,
  me,
  isHost,
  one,
  many,
  onNewGame,
}: {
  pub: Pub
  me: string
  isHost: boolean
  one: string
  many: string
  onNewGame: () => void
}) {
  const table = standings(pub)
  const top = table[0]?.score ?? 0
  const winners = table.filter((r) => r.score === top)
  const played = useRef(false)
  useEffect(() => {
    if (isHost && !played.current) {
      played.current = true
      sound.fanfare()
    }
  }, [isHost])
  return (
    <section className="screen">
      <div className="winner">
        <div className="crown">👑</div>
        {winners.map((w) => (
          <div key={w.uid} className="winner-name">
            <Badge id={pub.players?.[w.uid]?.badge} size="lg" />
            <span className="chrome">{nameOf(pub, w.uid)}</span>
          </div>
        ))}
        <p>{winners.length > 1 ? many : one}</p>
      </div>
      <ScoreTable pub={pub} me={me} />
      {isHost ? (
        <Button onClick={onNewGame}>Nova igra</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene novu igru</Waiting>
      )}
    </section>
  )
}
