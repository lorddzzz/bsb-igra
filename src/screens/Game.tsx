import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import { getCategory } from '../data/words'
import {
  asList,
  catchThreshold,
  categoryChoices,
  caughtImpostors,
  pickerFor,
  playerOrder,
  standings,
  targetFor,
  votesAgainst,
  votesOf,
} from '../game/logic'
import { useActions, type Actions, type RoomView } from '../game/room'
import { MAX_VOTES, MIN_PLAYERS, MODES, type Pub, type Secret } from '../game/types'
import { Badge, Button, Hint, nameOf, PlayerTag, Ticket, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import { useYourTurn } from '../ui/stageSounds'

interface Props {
  be: Backend
  code: string
  view: RoomView
}

export function Game({ be, code, view }: Props) {
  const actions = useActions(be, code, view)
  const pub = view.pub!
  const me = be.uid
  const isHost = pub.hostUid === me
  const common = { pub, me, isHost, actions, view, code }

  switch (pub.phase) {
    case 'lobby':
      return <Lobby {...common} />
    case 'category':
      return <CategoryPick {...common} />
    case 'clues':
      return <Clues {...common} />
    case 'voting':
      return <Voting {...common} />
    case 'reveal':
      return <Reveal {...common} />
    case 'guess':
      return <Guess {...common} />
    case 'score':
      return <Score {...common} />
    case 'over':
      return <GameOver {...common} />
    default:
      // e.g. a phone on an older version moved the room to a screen this version no longer has
      return <Waiting>Učitavanje</Waiting>
  }
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: Actions
  view: RoomView
  code: string
}

function Lobby({ pub, me, isHost, actions, code }: ScreenProps) {
  const order = playerOrder(pub)
  const missing = Math.max(0, MIN_PLAYERS - order.length)
  const link = `${location.origin}${location.pathname}?soba=${code}`
  const [copied, setCopied] = useState(false)

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Uljez', text: `Uđi u sobu ${code}`, url: link })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
      }
    } catch {
      /* share sheet closed */
    }
  }

  return (
    <section className="screen">
      <div className="card center">
        <small className="label">SOBA</small>
        <div className="room-code chrome">{code}</div>
        <Button variant="ghost" small onClick={share}>
          {copied ? 'Link kopiran ✓' : '📲 Pošalji link drugarima'}
        </Button>
      </div>

      <div className="card">
        <h2>Družina ({order.length})</h2>
        <ul className="player-list">
          {order.map((uid) => (
            <li key={uid}>
              <PlayerTag
                player={pub.players?.[uid]}
                you={uid === me}
                extra={uid === pub.hostUid ? <span className="host-tag">domaćin</span> : null}
              />
              {isHost && uid !== me && (
                <button className="icon-btn" onClick={() => actions.kick(uid)} aria-label="Izbaci">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Dužina igre</h2>
        <div className="segmented">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={pub.mode === m.id ? 'on' : ''}
              disabled={!isHost}
              onClick={() => actions.setMode(m.id)}
            >
              <b>{m.name}</b>
              <small>{m.detail}</small>
            </button>
          ))}
        </div>
      </div>

      {isHost ? (
        <Button disabled={missing > 0} onClick={actions.startGame}>
          {missing > 0 ? `Treba još ${missing} ${missing === 1 ? 'igrač' : 'igrača'}` : 'Na posao! Počni igru 💥'}
        </Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene igru</Waiting>
      )}
    </section>
  )
}

function CategoryPick({ pub, me, actions }: ScreenProps) {
  const picker = pickerFor(pub)
  useYourTurn(picker === me, pub.round)
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <Hint pub={pub}>
        Svi će dobiti istu tajnu reč iz ove kategorije, osim uljeza. Uljez zna samo kategoriju.
      </Hint>
      {picker === me ? (
        <>
          <h1 className="title">Ti biraš kategoriju!</h1>
          <div className="category-grid">
            {categoryChoices(pub).map((c) => (
              <button key={c.id} className="category" onClick={() => {
                  sound.lock()
                  void actions.pickCategory(c.id)
                }}>
                <span className="cat-icon">{c.icon}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card center">
          <PlayerTag player={pub.players?.[picker]} />
          <Waiting>bira kategoriju</Waiting>
        </div>
      )}
      <MiniScores pub={pub} me={me} />
    </section>
  )
}

function Clues({ pub, me, isHost, actions, view }: ScreenProps) {
  const category = pub.category ? getCategory(pub.category) : null
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className="pill">
        {category?.icon} {category?.name}
      </div>
      <Ticket ticket={view.ticket} player={pub.players?.[me]} round={pub.round} />
      <Hint pub={pub}>
        Ako znaš reč, daj trag koji pomaže ostalima, ali ne odaje reč uljezu. Ako si uljez, blefiraj! Ove runde
        može biti 1 ili 2 uljeza 🤫
      </Hint>
      <div className="card">
        <p className="big-line">
          <PlayerTag player={pub.players?.[pub.starter ?? '']} you={pub.starter === me} /> počinje.
        </p>
        <p className="muted">Idite u krug dva puta. Svako kaže po jednu reč.</p>
      </div>
      {isHost ? (
        <Button onClick={actions.toVoting}>Gotovi smo, glasanje! 🗳️</Button>
      ) : (
        <Waiting>{nameOf(pub, pub.hostUid)} pokreće glasanje kad završite</Waiting>
      )}
    </section>
  )
}

function Voting({ pub, me, isHost, actions, view }: ScreenProps) {
  const order = playerOrder(pub)
  const mine = votesOf(pub, me)
  const locked = pub.locked ?? {}
  const count = order.filter((uid) => locked[uid]).length
  const full = mine.length >= MAX_VOTES
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <h1 className="title">Ko je uljez?</h1>
      <Hint pub={pub}>
        Glasaju svi, i uljez, da ne bi upadao u oči. Možeš da izabereš jednu ili dve osobe: svaki pogođen glas je +1,
        ali svaki promašaj je poen za uljeza.
      </Hint>
      <div className="vote-list">
        {order
          .filter((uid) => uid !== me)
          .map((uid) => (
            <button
              key={uid}
              className={`vote${mine.includes(uid) ? ' on' : ''}`}
              disabled={Boolean(locked[me]) || (full && !mine.includes(uid))}
              onClick={() => {
                sound.pop()
                void actions.vote(uid)
              }}
            >
              <PlayerTag player={pub.players?.[uid]} />
              {mine.includes(uid) && <span className="check">✓</span>}
            </button>
          ))}
      </div>
      {!locked[me] && (
        <Button
          disabled={!mine.length}
          onClick={() => {
            sound.lock()
            return actions.lockVote()
          }}
        >
          {mine.length ? `Potvrdi glas (${mine.length} od ${MAX_VOTES}) 🗳️` : 'Izaberi 1 ili 2 osobe'}
        </Button>
      )}
      <div className="card center">
        <div className="voted-row">
          {order.map((uid) => (
            <span key={uid} className={locked[uid] ? 'voted' : 'not-voted'}>
              <Badge id={pub.players?.[uid]?.badge} size="sm" />
            </span>
          ))}
        </div>
        <small className="muted">
          Glasalo {count} od {order.length}
        </small>
        {isHost && count > 0 && count < order.length && (
          <button className="link-btn" onClick={actions.closeVoting}>
            Ne čekaj ostale
          </button>
        )}
      </div>
      <Ticket ticket={view.ticket} player={pub.players?.[me]} round={pub.round} />
    </section>
  )
}

/** Drum roll on the host phone, then the big reveal. */
function Reveal({ pub, me, isHost, actions, view }: ScreenProps) {
  const secret = view.secret?.round === pub.round ? view.secret : null
  const [shown, setShown] = useState(false)
  const played = useRef(false)

  const ready = Boolean(secret)
  // The ref only keeps the sounds from playing twice; the timer is re-armed whenever the effect re-runs,
  // otherwise a re-run (a refresh landing here with the answers already loaded) left the drum rolling forever.
  useEffect(() => {
    if (!secret) return
    const first = !played.current
    played.current = true
    if (isHost && first) sound.drumRoll()
    const t = setTimeout(() => {
      setShown(true)
      if (isHost && first) (caughtImpostors(pub, secret).length ? sound.cheer : sound.scratch)()
    }, 2400)
    return () => clearTimeout(t)
    // runs when the round's answers arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  if (!secret || !shown)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <div className="drumroll">
          <div className="spotlight" />
          <h1 className="title chrome">Uljez je…</h1>
          <div className="drum">🥁</div>
        </div>
      </section>
    )

  const caught = caughtImpostors(pub, secret)
  const two = secret.impostors.length > 1
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      {two && <h1 className="title chrome">Bila su DVA uljeza!</h1>}
      {secret.impostors.map((uid) => {
        const got = caught.includes(uid)
        const impostor = pub.players?.[uid]
        return (
          <div key={uid} className={`reveal-card ${got ? 'caught' : 'escaped'}`}>
            <Badge id={impostor?.badge} size="lg" />
            <div className="reveal-name">{impostor?.name ?? 'Neko'}</div>
            <div className="reveal-verdict">{got ? 'UHVAĆEN! 🎉' : 'POBEGAO! 😈'}</div>
          </div>
        )
      })}
      {caught.length === 0 && (
        <div className="card center">
          <small className="label">REČ JE BILA</small>
          <div className="reveal-word-big chrome">{secret.word}</div>
        </div>
      )}
      <VoteSummary pub={pub} secret={secret} me={me} />
      {caught.length > 0 && (
        <p className="muted center">
          {caught.includes(me)
            ? 'Ali nije gotovo: pogodi reč i ukradi 2 poena!'
            : caught.length > 1
              ? `${caught.map((uid) => nameOf(pub, uid)).join(' i ')} sada mogu da pogađaju reč za 2 poena.`
              : `${nameOf(pub, caught[0])} sada može da pogađa reč za 2 poena.`}
        </p>
      )}
      {isHost ? (
        <Button onClick={actions.afterReveal}>Dalje</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} nastavi</Waiting>
      )}
    </section>
  )
}

function VoteSummary({ pub, secret, me }: { pub: Pub; secret: Secret; me: string }) {
  const order = playerOrder(pub)
  return (
    <div className="card">
      <h2>Glasovi</h2>
      <ul className="vote-summary">
        {order.map((uid) => {
          const targets = votesOf(pub, uid)
          if (!targets.length) return null
          const knewWord = !secret.impostors.includes(uid)
          return (
            <li key={uid} className={knewWord && targets.some((t) => secret.impostors.includes(t)) ? 'right' : ''}>
              <PlayerTag player={pub.players?.[uid]} you={uid === me} />
              <span className="arrow">→</span>
              <span className="vote-targets">
                {targets.map((t) => (
                  <PlayerTag key={t} player={pub.players?.[t]} />
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      <small className="muted">
        {secret.impostors.map((uid) => `${nameOf(pub, uid)}: ${votesAgainst(pub, uid)} od ${order.length - 1}`).join(', ')}{' '}
        glasova (treba {catchThreshold(order.length)} da bi uljez bio uhvaćen)
      </small>
    </div>
  )
}

function Guess({ pub, me, actions, view }: ScreenProps) {
  const secret = view.secret?.round === pub.round ? view.secret : null
  const guessing = secret ? caughtImpostors(pub, secret).filter((uid) => !pub.guesses?.[uid]) : []
  useYourTurn(guessing.includes(me), pub.round)
  if (!secret) return <Waiting>Učitavanje</Waiting>
  const category = getCategory(secret.category)
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      {guessing.includes(me) ? (
        <>
          <h1 className="title">Koja je bila reč?</h1>
          <p className="muted center">
            {category.icon} {category.name}. Pogodi i dobijaš +2.
          </p>
          <div className="category-grid">
            {secret.options.map((w) => (
              <button key={w} className="category" onClick={() => {
                  sound.lock()
                  void actions.guess(w)
                }}>
                {w}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card center">
          {guessing.map((uid) => (
            <PlayerTag key={uid} player={pub.players?.[uid]} />
          ))}
          <Waiting>{guessing.length > 1 ? 'pogađaju' : 'pogađa'} reč za 2 poena</Waiting>
        </div>
      )}
    </section>
  )
}

function Score({ pub, me, isHost, actions }: ScreenProps) {
  const last = pub.last
  const next = pickerFor({ ...pub, round: pub.round + 1 })
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      {last && <RoundWord pub={pub} />}
      {last && (
        <div className="card">
          <h2>Ova runda</h2>
          <ul className="gains">
            {playerOrder(pub).map((uid) => {
              const g = last.gains[uid]
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
      )}
      <Standings pub={pub} me={me} />
      {isHost ? (
        <Button onClick={actions.nextRound}>Sledeća runda 💥</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene sledeću rundu</Waiting>
      )}
      <p className="muted center">Sledeći bira: {nameOf(pub, next)}</p>
    </section>
  )
}

function GameOver({ pub, me, isHost, actions }: ScreenProps) {
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
        <p>{winners.length > 1 ? 'dele pobedu!' : 'je pobednik!'}</p>
      </div>
      <Standings pub={pub} me={me} />
      {isHost ? (
        <Button onClick={actions.newGame}>Nova igra</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene novu igru</Waiting>
      )}
    </section>
  )
}

/** The round's word, plus how the caught impostors' guesses went. */
function RoundWord({ pub }: { pub: Pub }) {
  const last = pub.last!
  const right = asList<string>(last.guessedRight)
  return (
    <div className="card center">
      {asList<string>(last.caught).map((uid) => (
        <p key={uid} className="big-line">
          {right.includes(uid) ? `${nameOf(pub, uid)} je pogodio reč! +2 🔥` : `${nameOf(pub, uid)} nije pogodio reč.`}
        </p>
      ))}
      <small className="label">REČ JE BILA</small>
      <div className="reveal-word-big chrome">{last.word}</div>
    </div>
  )
}

function Standings({ pub, me }: { pub: Pub; me: string }) {
  const target = targetFor(pub)
  return (
    <div className="card">
      <h2>Tabela {target ? <small className="muted">do {target}</small> : null}</h2>
      <ol className="standings">
        {standings(pub).map((r) => (
          <li key={r.uid}>
            <PlayerTag player={pub.players?.[r.uid]} you={r.uid === me} />
            <span className="bar">
              <span
                style={{ width: `${Math.min(100, (r.score / (target ?? Math.max(10, r.score))) * 100)}%` }}
              />
            </span>
            <b>{r.score}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MiniScores({ pub, me }: { pub: Pub; me: string }) {
  if (pub.round <= 1) return null
  return <Standings pub={pub} me={me} />
}

function RoundTitle({ pub }: { pub: Pub }) {
  return <div className="round-title">RUNDA {pub.round}</div>
}
