import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Backend } from '../backend'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import {
  duelists,
  HAND,
  licOf,
  matchWinner,
  opponentOf,
  playedBy,
  potOf,
  ROUNDS,
  sum,
  upcoming,
  wins,
  WINS_NEEDED,
} from '../lic/logic'
import { useLicActions, type LicActions } from '../lic/room'
import { Badge, badgeOf, Button, Hint, nameOf, Waiting } from '../ui/components'
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
  actions: LicActions
  code: string
}

/** +7, −2 (with a real minus sign). */
const fmt = (v: number) => (v < 0 ? `−${-v}` : `+${v}`)

export function Lic({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useLicActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return (
        <PartyLobby
          {...common}
          title="Licitacija"
          minPlayers={2}
          steps={[
            'Igra se u dvoje. Svako ima karte od 1 do 13 i svaku može da odigra samo jednom.',
            'Svake runde na sto izlazi nagrada (+1 do +10) ili kazna (−1 do −3). Oboje tajno izaberete kartu.',
            'Veća karta uzima nagradu, manja dobija kaznu. Igra se na dve dobijene igre.',
          ]}
          onKick={actions.kick}
          onStart={actions.start}
        />
      )
    case 'bid':
      return <Bid key={`${licOf(pub).set}-${pub.round}`} {...common} />
    case 'duel':
      return <Duel {...common} />
    case 'set':
      return <SetOver {...common} />
    case 'over':
      return <MatchOver {...common} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="round-title">
      IGRA {licOf(pub).set ?? 1} · RUNDA {pub.round} / {ROUNDS}
    </div>
  )
}

/** Me on the left, my friend on the right: this game's points and the games won in the match. */
function Duo({ pub, me }: { pub: Pub; me: string }) {
  const order = duelists(pub).includes(me) ? [me, opponentOf(pub, me)] : duelists(pub)
  return (
    <div className="lic-duo">
      {order.map((uid, i) => {
        const player = uid ? pub.players?.[uid] : undefined
        return (
          <div
            key={uid ?? i}
            className="lic-side"
            style={{ '--c': badgeOf(player?.badge).color } as CSSProperties}
          >
            <Badge id={player?.badge} size="md" />
            <span className="lic-name">
              {player?.name ?? 'Neko'}
              {uid === me && <span className="you">ti</span>}
            </span>
            <b className="lic-points">{uid ? (pub.scores?.[uid] ?? 0) : 0}</b>
            <span className="lic-pips" aria-label={`${uid ? wins(pub, uid) : 0} dobijenih igara`}>
              {Array.from({ length: WINS_NEEDED }, (_, k) => (
                <i key={k} className={uid && k < wins(pub, uid) ? 'on' : ''} />
              ))}
            </span>
          </div>
        )
      })}
      <span className="lic-vs chrome">VS</span>
    </div>
  )
}

function Prize({ value, big }: { value: number; big?: boolean }) {
  return <span className={`lic-prize${value < 0 ? ' bad' : ''}${big ? ' big' : ''}`}>{fmt(value)}</span>
}

function Pot({ pot }: { pot: number[] }) {
  const value = sum(pot)
  return (
    <div className={`card center lic-pot${value < 0 ? ' bad' : ''}`}>
      <small className="label">{pot.length > 1 ? 'DŽEKPOT NA STOLU 💰' : 'NA STOLU'}</small>
      <div className="lic-pot-row">
        {pot.map((v, i) => (
          <Prize key={i} value={v} big />
        ))}
      </div>
      {pot.length > 1 && <div className="lic-pot-sum">ukupno {fmt(value)}</div>}
      <p className="lic-rule">{value < 0 ? 'Kazna! Manja karta je dobija 😬' : 'Veća karta uzima'}</p>
    </div>
  )
}

/** All 13 cards, the used ones dimmed. Tappable only for my own hand while bidding. */
function Hand({
  used,
  pick,
  onPick,
  small,
}: {
  used: number[]
  pick?: number | null
  onPick?: (card: number) => void
  small?: boolean
}) {
  return (
    <div className={`lic-hand${small ? ' small' : ''}`}>
      {HAND.map((c) => {
        const gone = used.includes(c)
        return onPick ? (
          <button
            key={c}
            className={`lic-card${pick === c ? ' on' : ''}`}
            disabled={gone}
            onClick={() => {
              sound.pop()
              onPick(c)
            }}
          >
            {c}
          </button>
        ) : (
          <span key={c} className={`lic-card${gone ? ' gone' : ''}`}>
            {c}
          </span>
        )
      })}
    </div>
  )
}

function Bid({ pub, me, actions }: ScreenProps) {
  const opp = opponentOf(pub, me)
  const lic = licOf(pub)
  const myBid = lic.bids?.[me]
  const oppIn = Boolean(opp && lic.bids?.[opp] !== undefined)
  const [pick, setPick] = useState<number | null>(null)
  const pot = potOf(pub)
  const left = [...upcoming(pub)].sort((a, b) => b - a)
  const firstGame = (lic.set ?? 1) === 1

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <Duo pub={pub} me={me} />
      <Pot pot={pot} />
      {firstGame && (
        <Hint pub={pub}>
          Izaberi jednu svoju kartu. {nameOf(pub, opp)} radi isto, tajno. Veći broj uzima nagradu, ali tu kartu više
          nemaš!
        </Hint>
      )}
      {myBid === undefined ? (
        <div className="card">
          <h2>Tvoje karte</h2>
          <Hand used={playedBy(pub, me)} pick={pick} onPick={setPick} />
          <Button
            disabled={pick === null}
            onClick={() => {
              if (pick === null) return
              sound.lock()
              return actions.bid(pick)
            }}
          >
            {pick === null ? 'Izaberi kartu' : `Licitiraj ${pick} 🔒`}
          </Button>
        </div>
      ) : (
        <div className="card center">
          <small className="label">TVOJA PONUDA</small>
          <span className="lic-card big on">{myBid}</span>
          <Waiting>Čekamo da {nameOf(pub, opp)} izabere</Waiting>
        </div>
      )}
      {opp && (
        <div className="card">
          <h2>
            {nameOf(pub, opp)} još ima {oppIn && <span className="lic-locked">· zaključano ✓</span>}
          </h2>
          <Hand used={playedBy(pub, opp)} small />
        </div>
      )}
      {left.length > 0 && (
        <div className="card">
          <h2>Još u špilu</h2>
          <div className="lic-pot-row left">
            {left.map((v, i) => (
              <Prize key={i} value={v} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Duel({ pub, me, isHost, actions }: ScreenProps) {
  const duel = licOf(pub).duel
  const value = sum(duel?.pot ?? [])
  const tie = !duel?.taker
  const lastRound = pub.round >= ROUNDS
  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    ;(tie ? sound.special : value < 0 ? sound.scratch : value >= 7 ? sound.cheer : sound.nice)()
  }, [isHost, tie, value])

  if (!duel) return <Waiting>Učitavanje</Waiting>
  const order = duelists(pub).includes(me) ? [me, opponentOf(pub, me)!] : duelists(pub)
  const taker = duel.taker
  const verdict = tie
    ? lastRound
      ? 'Iste karte! Poslednja runda, niko ne dobija ništa.'
      : 'Iste karte! Sve ostaje na stolu za sledeću rundu 💰'
    : value < 0
      ? `${taker === me ? 'Ti dobijaš' : `${nameOf(pub, taker)} dobija`} kaznu ${fmt(value)} 😬`
      : `${taker === me ? 'Ti uzimaš' : `${nameOf(pub, taker)} uzima`} ${fmt(value)} 🎉`

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className="lic-reveal">
        {order.map((uid) => {
          const player = pub.players?.[uid]
          const mark = uid === taker ? (value < 0 ? ' hit' : ' win') : ''
          return (
            <div key={uid} className={`lic-reveal-side${mark}`}>
              <span className="lic-card huge flip">{duel.bids[uid]}</span>
              <span className="lic-name" style={{ color: badgeOf(player?.badge).color }}>
                {player?.name ?? 'Neko'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="card center">
        <div className="lic-pot-row">
          {duel.pot.map((v, i) => (
            <Prize key={i} value={v} />
          ))}
        </div>
        <p className="big-line">{verdict}</p>
      </div>
      <Duo pub={pub} me={me} />
      <Button onClick={actions.next}>{lastRound ? 'Kraj igre 🏁' : 'Sledeća runda 💥'}</Button>
    </section>
  )
}

function SetOver({ pub, me, isHost, actions }: ScreenProps) {
  const { setWinner, set = 1 } = licOf(pub)
  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    ;(setWinner ? sound.cheer : sound.scratch)()
  }, [isHost, setWinner])

  return (
    <section className="screen">
      <div className="round-title">KRAJ IGRE {set}</div>
      <div className="winner">
        {setWinner ? (
          <>
            <div className="winner-name">
              <Badge id={pub.players?.[setWinner]?.badge} size="lg" />
              <span className="chrome">{nameOf(pub, setWinner)}</span>
            </div>
            <p>{setWinner === me ? 'Dobijaš ovu igru!' : 'dobija ovu igru!'}</p>
          </>
        ) : (
          <>
            <h1 className="title">Nerešeno!</h1>
            <p>Ova igra se ne računa, igrate je ponovo.</p>
          </>
        )}
      </div>
      <Duo pub={pub} me={me} />
      <p className="muted center">Pobeđuje ko prvi dobije {WINS_NEEDED} igre.</p>
      <Button onClick={actions.nextSet}>Sledeća igra 💥</Button>
    </section>
  )
}

function MatchOver({ pub, me, isHost, actions }: ScreenProps) {
  const winner = matchWinner(pub)
  const loser = winner ? opponentOf(pub, winner) : undefined
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
        {winner && (
          <div className="winner-name">
            <Badge id={pub.players?.[winner]?.badge} size="lg" />
            <span className="chrome">{nameOf(pub, winner)}</span>
          </div>
        )}
        <p>
          {winner === me ? 'Dobijaš meč' : 'dobija meč'} {winner ? wins(pub, winner) : 0}:{loser ? wins(pub, loser) : 0}!
        </p>
      </div>
      <Duo pub={pub} me={me} />
      <Button onClick={actions.rematch}>Revanš 🔁</Button>
      {isHost && (
        <button className="link-btn" onClick={actions.lobby}>
          Nazad u sobu
        </button>
      )}
    </section>
  )
}
