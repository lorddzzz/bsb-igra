import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import {
  answersOf,
  cijaOf,
  currentPrompt,
  foolCap,
  guessersOf,
  isFinalRound,
  levelOf,
  MAX_ANSWER_LENGTH,
  MAX_ROUNDS,
  MIN_ROUNDS,
  orderOf,
  roundsOf,
} from '../cija/logic'
import { useCijaActions, type CijaActions } from '../cija/room'
import { CIJA_LEVELS } from '../data/cijaPrompts'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { playerOrder } from '../game/util'
import { Badge, Button, Hint, nameOf, PlayerTag, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import { DoneRow, PartyLobby, RoundGains, ScoreTable, Winner } from './shared'

interface Props {
  be: Backend
  code: string
  view: RoomView
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: CijaActions
  code: string
}

/** The letters answers are shown under, so friends can say "I think B is Ana" out loud. */
const LETTERS = 'ABCDEFGH'
const letterOf = (i: number) => LETTERS[i] ?? String(i + 1)

export function Cija({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useCijaActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return <Lobby {...common} />
    case 'write':
      return <Write {...common} />
    case 'match':
      // keyed by the board order, so a reshuffled board starts again on its first answer
      return <Match key={orderOf(pub).join()} {...common} />
    case 'result':
      return <Reveal {...common} />
    case 'over':
      return <GameOver {...common} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function Lobby({ pub, me, isHost, actions, code }: ScreenProps) {
  const level = levelOf(pub)
  const rounds = roundsOf(pub)
  const counts = Array.from({ length: MAX_ROUNDS - MIN_ROUNDS + 1 }, (_, i) => MIN_ROUNDS + i)
  return (
    <PartyLobby
      {...{ pub, me, isHost, code }}
      title="Čije je ovo?"
      steps={[
        'Svako anonimno odgovori na isto lično pitanje.',
        'Odgovori se pomešaju. Pogodi čiji je koji.',
        'Poen za svaki pogodak, i za svakog drugara koga prevariš.',
      ]}
      onKick={actions.kick}
      onStart={actions.start}
    >
      <div className="card">
        <h2>Koliko lično?</h2>
        <div className="segmented">
          {CIJA_LEVELS.map((l) => (
            <button key={l.id} className={level === l.id ? 'on' : ''} disabled={!isHost} onClick={() => actions.setLevel(l.id)}>
              <b>{l.name}</b>
              <small>{l.detail}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>Broj pitanja</h2>
        <div className="segmented four">
          {counts.map((n) => (
            <button key={n} className={rounds === n ? 'on' : ''} disabled={!isHost} onClick={() => actions.setRounds(n)}>
              <b>{n}</b>
            </button>
          ))}
        </div>
      </div>
    </PartyLobby>
  )
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="round-title">
      PITANJE {pub.round} / {roundsOf(pub)}
    </div>
  )
}

function PromptCard({ pub }: { pub: Pub }) {
  return (
    <div className="card center prompt">
      <small className="label">O SEBI</small>
      <p className="prompt-text">{currentPrompt(pub).q}</p>
    </div>
  )
}

function Write({ pub, me, actions }: ScreenProps) {
  const answers = cijaOf(pub).answers ?? {}
  const mine = answers[me]
  const [text, setText] = useState('')
  const send = async () => {
    if (!text.trim()) return
    sound.lock()
    await actions.writeAnswer(text)
  }

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <PromptCard pub={pub} />
      <Hint pub={pub}>
        Odgovori iskreno i kratko. Niko ne zna čiji je koji odgovor, a drugari će pokušati da pogode.
      </Hint>
      {mine ? (
        <div className="card center">
          <small className="label">TVOJ ODGOVOR</small>
          <div className="my-lie">{mine}</div>
        </div>
      ) : (
        <div className="card">
          <h2>Tvoj odgovor</h2>
          <input
            className="name-input"
            value={text}
            maxLength={MAX_ANSWER_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void send()}
            placeholder="Kratko i iskreno"
            autoComplete="off"
            enterKeyHint="send"
          />
          <Button disabled={!text.trim()} onClick={send}>
            Pošalji odgovor 🤫
          </Button>
        </div>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={answers} label="Odgovorilo" />
      </div>
    </section>
  )
}

/**
 * The match-up board. Tap an answer, then tap the friend you think wrote it; the board moves to the next
 * answer by itself. Everyone wrote exactly one answer, so a friend can only be used once, and the last
 * answer is filled in for you.
 */
function Match({ pub, me, actions }: ScreenProps) {
  const answers = answersOf(pub)
  const order = orderOf(pub)
  const guesses = cijaOf(pub).guesses ?? {}
  const sent = guesses[me]
  const owners = order.filter((o) => o !== me)
  const friends = playerOrder(pub).filter((u) => u !== me)

  const [assign, setAssign] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | undefined>(owners[0])

  const board: Record<string, string> = sent ?? assign
  const free = (map: Record<string, string>) => owners.filter((o) => !map[o])
  const complete = owners.length > 0 && free(board).length === 0

  const choose = (uid: string) => {
    if (sent || !active) return
    sound.pop()
    const next: Record<string, string> = {}
    for (const [owner, who] of Object.entries(assign)) if (who !== uid) next[owner] = who
    next[active] = uid
    // one answer and one friend left: there is only one way to finish
    const open = free(next)
    const unused = friends.filter((f) => !Object.values(next).includes(f))
    if (open.length === 1 && unused.length === 1) next[open[0]] = unused[0]
    setAssign(next)
    const after = owners.slice(owners.indexOf(active) + 1).concat(owners.slice(0, owners.indexOf(active)))
    setActive(after.find((o) => !next[o]))
  }

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <PromptCard pub={pub} />
      <Hint pub={pub}>
        Dodirni odgovor, pa ime drugara za koga misliš da je autor. Svako je napisao tačno jedan.
      </Hint>
      <div className="match-list">
        {order.map((owner, i) => {
          const own = owner === me
          const who = board[owner]
          return (
            <button
              key={owner}
              className={`match-card${own ? ' own' : ''}${active === owner && !sent ? ' active' : ''}`}
              disabled={own || Boolean(sent)}
              onClick={() => {
                sound.pop()
                setActive(owner)
              }}
            >
              <span className="match-letter">{letterOf(i)}</span>
              <span className="match-text">{answers[owner]}</span>
              <span className="match-who">
                {own ? (
                  <small className="muted">tvoj</small>
                ) : who ? (
                  <Badge id={pub.players?.[who]?.badge} size="sm" />
                ) : (
                  <b className="muted">?</b>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {!sent && (
        <div className="card">
          <h2>{active ? `Čiji je odgovor ${letterOf(order.indexOf(active))}?` : 'Sve je razvrstano'}</h2>
          <div className="roster">
            {friends.map((uid) => {
              const at = Object.entries(assign).find(([, who]) => who === uid)?.[0]
              return (
                <button key={uid} className={`roster-chip${at ? ' used' : ''}`} disabled={!active} onClick={() => choose(uid)}>
                  <Badge id={pub.players?.[uid]?.badge} size="sm" />
                  <span>{nameOf(pub, uid)}</span>
                  {at && <small className="chip-letter">{letterOf(order.indexOf(at))}</small>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {!sent && (
        <Button
          disabled={!complete}
          onClick={() => {
            sound.lock()
            return actions.match(assign)
          }}
        >
          {complete ? 'Zaključaj odgovore 🔒' : `Još ${free(board).length} za razvrstavanje`}
        </Button>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={guesses} label="Zaključalo" />
      </div>
    </section>
  )
}

/** Drum roll on the host phone, then each answer is unmasked one by one. */
function Reveal({ pub, me, isHost, actions }: ScreenProps) {
  const { result } = cijaOf(pub)
  const answers = answersOf(pub)
  const order = orderOf(pub)
  const [shown, setShown] = useState(false)
  const played = useRef(false)

  useEffect(() => {
    if (isHost && !played.current) sound.drumRoll()
    played.current = true
    const t = setTimeout(() => setShown(true), 2000)
    return () => clearTimeout(t)
  }, [isHost])

  const doneAt = order.length * 0.9
  const mineRight = result?.gains[me]?.right ?? 0
  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => (isHost ? sound.cheer : mineRight > 0 ? sound.correct : sound.wrong)(), doneAt * 1000)
    return () => clearTimeout(t)
  }, [shown, isHost, doneAt, mineRight])

  if (!shown)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <div className="drumroll">
          <div className="spotlight" />
          <h1 className="title chrome">Čiji je koji odgovor…</h1>
          <div className="drum">🥁</div>
        </div>
      </section>
    )

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className="answers">
        {order.map((owner, i) => {
          const { right, wrong } = guessersOf(pub, owner)
          return (
            <div key={owner} className="answer-card lie" style={{ animationDelay: `${i * 0.9}s` }}>
              <div className="answer-text">
                <span className="match-letter">{letterOf(i)}</span> {answers[owner]}
              </div>
              <div className="answer-who">
                <span className="liars">
                  Autor: <PlayerTag player={pub.players?.[owner]} you={owner === me} />
                </span>
              </div>
              <div className="answer-pickers">
                <small className="muted">pogodili:</small>
                {right.length ? right.map((uid) => <Badge key={uid} id={pub.players?.[uid]?.badge} size="sm" />) : <small className="muted">niko</small>}
              </div>
              {wrong.length > 0 && (
                <div className="answer-pickers missed">
                  <small className="muted">promašili:</small>
                  {wrong.map((uid) => (
                    <Badge key={uid} id={pub.players?.[uid]?.badge} size="sm" />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="after-reveal" style={{ animationDelay: `${doneAt}s` }}>
        {result && <RoundGains pub={pub} me={me} title="Ovo pitanje" gains={result.gains} />}
        <small className="muted center-text">
          Za prevarene drugare dobijaš najviše {foolCap(playerOrder(pub).length)} {foolCap(playerOrder(pub).length) === 1 ? 'poen' : 'poena'} po odgovoru.
        </small>
        <ScoreTable pub={pub} me={me} />
        {isHost ? (
          <Button onClick={actions.next}>{isFinalRound(pub) ? 'Proglasi pobednika 👑' : 'Sledeće pitanje 💥'}</Button>
        ) : (
          <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} nastavi</Waiting>
        )}
      </div>
    </section>
  )
}

function GameOver({ pub, me, isHost, actions }: ScreenProps) {
  return (
    <Winner
      {...{ pub, me, isHost }}
      one="najbolje poznaje družinu!"
      many="dele titulu najboljeg poznavaoca družine!"
      onNewGame={actions.newGame}
    />
  )
}
