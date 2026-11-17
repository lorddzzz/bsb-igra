import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Backend } from '../backend'
import type { RoomView } from '../game/room'
import { asList } from '../game/util'
import type { Pub } from '../game/types'
import {
  HAND_SIZE,
  START_LIVES,
  handOf,
  marksFor,
  partnerOf,
  playable,
  rankOf,
  suitOf,
  tableOf,
  tasksOf,
  tihaOf,
} from '../tiha/logic'
import { useTihaActions, type TihaActions } from '../tiha/room'
import type { TihaCard, TihaMark, TihaSuit, TihaTask } from '../tiha/types'
import { Badge, nameOf, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import { PartyLobby } from './shared'

interface Props {
  be: Backend
  code: string
  view: RoomView
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: TihaActions
}

const SUIT_NAME: Record<TihaSuit, string> = { r: 'crvena', g: 'zelena', b: 'plava', y: 'žuta', a: 'adut' }
/** A shape per colour, so a card is never told apart by colour alone. */
const SUIT_SYMBOL: Record<TihaSuit, string> = { r: '●', g: '▲', b: '■', y: '◆', a: '⚡' }
const MARK_LABEL: Record<TihaMark, string> = { high: 'najviša', low: 'najniža', only: 'jedina' }

/** 1 štih, 2–4 štiha, 5+ štihova (and 11 štihova, 21 štih). */
function tricks(n: number): string {
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 14
  return `${n} ${last === 1 && !teen ? 'štih' : last >= 2 && last <= 4 && !teen ? 'štiha' : 'štihova'}`
}

const cardName = (card: TihaCard) => `${SUIT_NAME[suitOf(card)]} ${rankOf(card)}`

/** The one card face used everywhere: big number, small shape. Trumps are dark with a bolt. */
export function TihaCardView({
  card,
  size = 'md',
  on,
  flag,
}: {
  card: TihaCard
  size?: 'sm' | 'md' | 'lg' | 'fill'
  on?: boolean
  /** A small marker in the corner, e.g. for the signalled card. */
  flag?: string
}) {
  const suit = suitOf(card)
  return (
    <span className={`tc tc-${suit} tc-${size}${on ? ' on' : ''}`} role="img" aria-label={cardName(card)}>
      <i className="tc-s" aria-hidden>
        {SUIT_SYMBOL[suit]}
      </i>
      <b className="tc-n" aria-hidden>
        {rankOf(card)}
      </b>
      {flag && (
        <em className="tc-flag" aria-hidden>
          {flag}
        </em>
      )}
    </span>
  )
}

/** A button that blocks double taps while the move is in flight. */
function Act({
  children,
  onClick,
  testid,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode
  onClick: () => unknown
  testid?: string
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'pink'
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <>
      <button
        className={`btn btn-${variant}`}
        data-testid={testid}
        disabled={disabled || busy}
        onClick={async () => {
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
      {failed && (
        <p className="error" role="alert">
          Potez nije uspeo. Proveri vezu i probaj ponovo.
        </p>
      )}
    </>
  )
}

export function Tiha({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useTihaActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions }

  switch (pub.phase) {
    case 'lobby':
      return (
        <PartyLobby
          {...common}
          code={code}
          title="Tiha misija"
          minPlayers={2}
          steps={[
            'Igra se u dvoje, bez priče. Vas dvoje ste jedna ekipa protiv misije.',
            'Izaberete zadatke, pa igrate štihove. Svako vidi samo svoje karte, a jedan signal svako sme da pokaže.',
            'Imate 3 života. Što više misija pređete, to bolje.',
          ]}
          onKick={actions.kick}
          onStart={actions.start}
        />
      )
    case 'draft':
      return <Draft {...common} />
    case 'play':
      return <Play {...common} />
    case 'result':
      return <Result {...common} />
    case 'over':
      return <Over {...common} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

/** Mission, lives and captain. Shown in every phase after the lobby. */
function Header({ pub, me }: { pub: Pub; me: string }) {
  const t = tihaOf(pub)
  const lives = t.lives ?? 0
  return (
    <div className="th-head">
      <b className="th-level chrome">MISIJA {t.level ?? 1}</b>
      <span className="th-lives" role="img" aria-label={`Životi: ${lives} od ${START_LIVES}`}>
        {Array.from({ length: START_LIVES }, (_, i) => (
          <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
        ))}
      </span>
      <span className="th-captain">
        kapetan: <b>{nameOf(pub, t.captain)}</b>
        {t.captain === me && <span className="you">ti</span>}
      </span>
    </div>
  )
}

/** What a task asks for, in full. */
function TaskText({ task }: { task: TihaTask }) {
  if (task.kind === 'count')
    return <span className="th-task-text">{task.n ? `Osvoji tačno ${tricks(task.n ?? 0)}` : 'Ne osvoji nijedan štih'}</span>
  if (task.kind === 'last') return <span className="th-task-text">Osvoji poslednji štih</span>
  return (
    <span className="th-task-text">
      Osvoji {task.card && <TihaCardView card={task.card} size="md" />}
      {task.order && <span className="th-order">{task.order === 'first' ? 'PRVI' : 'POSLEDNJI'}</span>}
    </span>
  )
}

/** The short form for the play strip. */
function TaskChip({ task }: { task: TihaTask }) {
  return (
    <span className={`th-chip${task.state ? ` ${task.state}` : ''}`}>
      {task.kind === 'win' && task.card && <TihaCardView card={task.card} size="sm" />}
      {task.kind === 'win' && task.order && <small className="th-order">{task.order === 'first' ? 'PRVI' : 'POSL.'}</small>}
      {task.kind === 'count' && <span>{task.n ? `Tačno ${tricks(task.n)}` : 'Nijedan štih'}</span>}
      {task.kind === 'last' && <span>Poslednji štih</span>}
      {task.state === 'done' && <span aria-label="gotovo">✅</span>}
      {task.state === 'failed' && <span aria-label="propalo">❌</span>}
    </span>
  )
}

/** Cards in a plain grid, not tappable. */
function CardRow({ cards, size = 'sm' }: { cards: TihaCard[]; size?: 'sm' | 'md' }) {
  return (
    <div className="th-row">
      {cards.length ? cards.map((c) => <TihaCardView key={c} card={c} size={size} />) : <span className="muted">—</span>}
    </div>
  )
}

function Draft({ pub, me, actions }: ScreenProps) {
  const turn = tihaOf(pub).turn
  const myTurn = turn === me
  const tasks = tasksOf(pub)
  const hand = handOf(pub, me)
  return (
    <section className="screen th">
      <Header pub={pub} me={me} />
      <div className="card">
        <h2>Zadaci misije</h2>
        <div className="th-tasks">
          {tasks.map((task) => {
            if (task.owner) {
              const mine = task.owner === me
              return (
                <div key={task.id} className={`th-task owned${mine ? ' mine' : ''}`}>
                  <TaskText task={task} />
                  <span className="th-owner-tag">{mine ? 'tvoj' : nameOf(pub, task.owner)}</span>
                </div>
              )
            }
            return (
              <button
                key={task.id}
                className="th-task open"
                data-testid={`task-${task.id}`}
                disabled={!myTurn}
                onClick={() => {
                  sound.pop()
                  // A refused or failed take leaves the tile open, so the player can simply tap again.
                  void Promise.resolve(actions.take(task.id)).catch(() => {})
                }}
              >
                <TaskText task={task} />
                {myTurn && <span className="th-owner-tag take">uzmi</span>}
              </button>
            )
          })}
        </div>
        {myTurn ? (
          <p className="big-line">Tvoj izbor. Dodirni zadatak.</p>
        ) : (
          <Waiting>{nameOf(pub, turn)} bira zadatak…</Waiting>
        )}
      </div>
      <div className="card">
        <h2>Tvoje karte</h2>
        <CardRow cards={hand} size="md" />
      </div>
    </section>
  )
}

function markText(mark: TihaMark, card: TihaCard): string {
  return `${MARK_LABEL[mark]} ${SUIT_NAME[suitOf(card)]}`
}

function Play({ pub, me, actions }: ScreenProps) {
  const t = tihaOf(pub)
  const opp = partnerOf(pub, me)
  const [pick, setPick] = useState<TihaCard | null>(null)
  const [sigMode, setSigMode] = useState(false)
  const [sigCard, setSigCard] = useState<TihaCard | null>(null)
  if (!opp) return <Waiting>Učitavanje</Waiting>

  const myTurn = t.turn === me
  const table = tableOf(pub)
  const lead = table[0]
  const canPlay = playable(pub, me)
  const mySignal = t.signals?.[me]
  const oppSignal = t.signals?.[opp]
  // only a yes/no about one already-shown card; the partner's hand itself is never rendered
  const oppSignalPlayed = Boolean(oppSignal) && !handOf(pub, opp).includes(oppSignal!.card)
  const all = handOf(pub, me)
  // the logic keeps the lead card in the hand until the trick is resolved
  const hand = all.filter((c) => !table.some((p) => p.uid === me && p.card === c))
  const sel = pick && canPlay.includes(pick) ? pick : null
  const sigOk = (c: TihaCard) => marksFor(pub, me, c).length > 0
  const sigSel = sigCard && sigOk(sigCard) ? sigCard : null
  const mine = tasksOf(pub).filter((x) => x.owner === me)
  const theirs = tasksOf(pub).filter((x) => x.owner === opp)
  const done = t.tricks ?? 0
  const finished = t.lastTrick

  const tapCard = (c: TihaCard) => {
    sound.pop()
    if (sigMode) setSigCard(c === sigSel ? null : c)
    else setPick(c === sel ? null : c)
  }
  const closeSignal = () => {
    setSigMode(false)
    setSigCard(null)
  }

  return (
    <section className="screen th">
      <Header pub={pub} me={me} />

      <div className="card th-strip">
        {[
          { uid: me, list: mine, label: 'Tvoji zadaci' },
          { uid: opp, list: theirs, label: `Zadaci: ${nameOf(pub, opp)}` },
        ].map((g) => (
          <div key={g.uid} className="th-strip-group">
            <small className="label">{g.label}</small>
            <div className="th-chips">
              {g.list.length ? g.list.map((x) => <TaskChip key={x.id} task={x} />) : <span className="muted">—</span>}
            </div>
          </div>
        ))}
      </div>

      {oppSignal && (
        <div className={`th-signal${oppSignalPlayed ? ' gone' : ''}`}>
          <span>{nameOf(pub, opp)} pokazuje:</span>
          <TihaCardView card={oppSignal.card} size="sm" />
          <b>– {markText(oppSignal.mark, oppSignal.card)}</b>
          {oppSignalPlayed && <small>(odigrana)</small>}
        </div>
      )}

      <div className="card th-table">
        <div className="th-count">
          <b>
            Štih {Math.min(HAND_SIZE, done + 1)}/{HAND_SIZE}
          </b>
          <span className="muted">
            {nameOf(pub, me)} {t.won?.[me] ?? 0} · {nameOf(pub, opp)} {t.won?.[opp] ?? 0}
          </span>
        </div>
        {lead ? (
          <div className="th-trick">
            <TihaCardView card={lead.card} size="lg" />
            <span className="muted">{lead.uid === me ? 'Ti baciš prvi' : `${nameOf(pub, lead.uid)} baca prvi`}</span>
          </div>
        ) : finished ? (
          <div className="th-trick">
            <div className="th-pair">
              {finished.cards.map((p) => (
                <span key={p.uid} className={`th-played${p.uid === finished.winner ? ' win' : ''}`}>
                  <TihaCardView card={p.card} size="lg" />
                  <small>{nameOf(pub, p.uid)}</small>
                </span>
              ))}
            </div>
            <b>Štih nosi {nameOf(pub, finished.winner)}</b>
          </div>
        ) : (
          <p className="muted center-text">Sto je prazan.</p>
        )}
      </div>

      {mySignal && (
        <div className={`th-signal mine${all.includes(mySignal.card) ? '' : ' gone'}`}>
          <span>Tvoj signal:</span>
          <TihaCardView card={mySignal.card} size="sm" />
          <b>– {markText(mySignal.mark, mySignal.card)}</b>
        </div>
      )}

      {sigMode ? (
        <p className="big-line">{sigSel ? 'Šta tačno pokazuješ?' : 'Dodirni kartu koju pokazuješ.'}</p>
      ) : myTurn ? (
        <p className="big-line">{lead ? 'Tvoj red. Odgovori na kartu.' : 'Tvoj red. Baci prvu kartu.'}</p>
      ) : (
        <Waiting>Čeka se {nameOf(pub, opp)}…</Waiting>
      )}

      <div className="th-hand">
        {hand.map((c) => {
          const ok = sigMode ? sigOk(c) : canPlay.includes(c)
          const flagged = mySignal?.card === c
          return (
            <button
              key={c}
              className={`tc-btn${(sigMode ? sigSel : sel) === c ? ' sel' : ''}${myTurn && !ok ? ' dim' : ''}`}
              data-testid={`card-${c}`}
              disabled={!ok}
              onClick={() => tapCard(c)}
            >
              <TihaCardView card={c} size="fill" on={(sigMode ? sigSel : sel) === c} flag={flagged ? '📢' : undefined} />
            </button>
          )
        })}
      </div>

      {sigMode ? (
        <div className="th-actions row signal">
          {sigSel &&
            marksFor(pub, me, sigSel).map((m) => (
              <Act
                key={m}
                testid={`mark-${m}`}
                onClick={async () => {
                  sound.lock()
                  await actions.signal(sigSel, m)
                  closeSignal()
                }}
              >
                {markText(m, sigSel)}
              </Act>
            ))}
          <Act variant="ghost" onClick={closeSignal} testid="signal-cancel">
            Odustani
          </Act>
        </div>
      ) : (
        myTurn && (
          <div className="th-actions row">
            <Act
              testid="play"
              disabled={!sel}
              onClick={async () => {
                if (!sel) return
                sound.lock()
                await actions.play(sel)
                setPick(null)
              }}
            >
              {sel ? 'Odigraj' : 'Izaberi kartu'}
            </Act>
            {!mySignal && (
              <Act
                variant="ghost"
                testid="signal"
                onClick={() => {
                  setPick(null)
                  setSigMode(true)
                }}
              >
                Signal
              </Act>
            )}
          </div>
        )
      )}
    </section>
  )
}

/** One line on why the mission failed. Names, not "you", so both phones read the same. */
function failReason(pub: Pub, task: TihaTask): string {
  const t = tihaOf(pub)
  const owner = nameOf(pub, task.owner)
  if (task.kind === 'count') {
    const won = t.won?.[task.owner ?? ''] ?? 0
    return `${owner} ima ${tricks(won)}, a treba ${task.n ? `tačno ${task.n}` : 'nijedan'}.`
  }
  const winner = t.lastTrick?.winner
  if (task.kind === 'last') return `Poslednji štih nosi ${nameOf(pub, winner)}, ne ${owner}.`
  const trick = t.lastTrick
  if (trick?.cards.some((p) => p.card === task.card) && trick.winner !== task.owner)
    return `Taj štih nosi ${nameOf(pub, trick.winner)}, ne ${owner}.`
  if (task.order) return `Redosled je pokvaren: ${task.order === 'first' ? 'prvi' : 'poslednji'} zadatak nije na redu.`
  return 'Zadatak više ne može da se ispuni.'
}

function Result({ pub, me, isHost, actions }: ScreenProps) {
  const t = tihaOf(pub)
  const won = t.outcome === 'won'
  const out = (t.lives ?? 0) <= 0
  const failed = tasksOf(pub).find((x) => x.id === t.failedTask)
  const hiddenList = asList<TihaCard>(t.hidden)
  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    ;(won ? sound.cheer : sound.scratch)()
  }, [isHost, won])
  const two = [me, partnerOf(pub, me)].filter((u): u is string => Boolean(u))

  return (
    <section className="screen th">
      <Header pub={pub} me={me} />
      <div className={`th-banner ${won ? 'won' : 'lost'}`}>
        <span className="chrome">{won ? 'MISIJA USPELA!' : 'MISIJA PROPALA!'}</span>
      </div>
      {!won && failed && (
        <div className="card th-failed">
          <small className="label">PROPAO ZADATAK</small>
          <TaskText task={failed} />
          <p className="muted">{failReason(pub, failed)}</p>
          <b className="th-minus">−1 život</b>
        </div>
      )}
      <div className="card">
        <h2>Karte van igre</h2>
        <CardRow cards={[...hiddenList].sort()} />
      </div>
      <div className="card">
        <h2>Šta je ostalo u rukama</h2>
        {two.map((uid) => (
          <div key={uid} className="th-left">
            <span className="th-left-name">
              <Badge id={pub.players?.[uid]?.badge} size="sm" />
              {nameOf(pub, uid)}
            </span>
            <CardRow cards={handOf(pub, uid)} />
          </div>
        ))}
      </div>
      <Act testid="next" onClick={actions.next}>
        {out ? 'Kraj akcije' : 'Sledeća misija'}
      </Act>
    </section>
  )
}

function Over({ pub, isHost, actions }: ScreenProps) {
  const t = tihaOf(pub)
  const cleared = t.cleared ?? 0
  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    ;(cleared > 0 ? sound.fanfare : sound.scratch)()
  }, [isHost, cleared])

  return (
    <section className="screen th">
      <div className="winner">
        <div className="crown">🤫</div>
        <h1 className="title">Stigli ste do misije {t.level ?? 1}</h1>
        <p>Uspešnih misija: {cleared}</p>
      </div>
      <Act testid="rematch" onClick={actions.rematch}>
        Nova akcija 🔁
      </Act>
      {isHost && (
        <button className="link-btn" onClick={actions.lobby}>
          Nazad u sobu
        </button>
      )}
    </section>
  )
}
