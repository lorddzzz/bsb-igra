import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import { PRVI_LEVELS } from '../data/prviPrompts'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { asList, playerOrder } from '../game/util'
import { currentPrompt, isFinalRound, levelOf, prviOf, ROUNDS, titlesOf, votersFor, votesOf } from '../prvi/logic'
import { usePrviActions, type PrviActions } from '../prvi/room'
import { Badge, Button, Hint, nameOf, PlayerTag, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import { DoneRow, PartyLobby, ScoreTable, Winner } from './shared'

interface Props {
  be: Backend
  code: string
  view: RoomView
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: PrviActions
  code: string
}

export function Prvi({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = usePrviActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return <Lobby {...common} />
    case 'vote':
      // keyed by round, so a new prompt starts with nobody picked
      return <Vote key={pub.round} {...common} />
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
  return (
    <PartyLobby
      {...{ pub, me, isHost, code }}
      title="Ko bi prvi?"
      steps={[
        'Pojavi se pitanje: „Ko bi prvi…?”',
        'Tajno glasaš za drugara koji najviše odgovara. Može i za sebe.',
        'Poen ako glasaš sa većinom. Najizabraniji nosi titulu.',
      ]}
      onKick={actions.kick}
      onStart={actions.start}
    >
      <div className="card">
        <h2>Koliko ljuto?</h2>
        <div className="segmented">
          {PRVI_LEVELS.map((l) => (
            <button key={l.id} className={level === l.id ? 'on' : ''} disabled={!isHost} onClick={() => actions.setLevel(l.id)}>
              <b>{l.name}</b>
              <small>{l.detail}</small>
            </button>
          ))}
        </div>
        <small className="muted">{ROUNDS} pitanja po igri.</small>
      </div>
    </PartyLobby>
  )
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="round-title">
      PITANJE {pub.round} / {ROUNDS}
    </div>
  )
}

function PromptCard({ pub }: { pub: Pub }) {
  const prompt = currentPrompt(pub)
  return (
    <div className="card center prompt">
      <small className="label">KO BI PRVI?</small>
      <p className="prompt-text">{prompt.q}</p>
      <small className="muted">
        Titula: <b className="prvi-title-name">{prompt.title}</b>
      </small>
    </div>
  )
}

function Vote({ pub, me, actions }: ScreenProps) {
  const votes = votesOf(pub)
  const sent = votes[me]
  const [pick, setPick] = useState<string | undefined>()
  const chosen = sent ?? pick

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <PromptCard pub={pub} />
      <Hint pub={pub}>Dodirni drugara, pa potvrdi. Možeš i sebe. Niko ne vidi glasove pre otkrivanja.</Hint>
      <div className="card">
        <h2>{sent ? 'Tvoj glas je poslat' : 'Tvoj glas'}</h2>
        <div className="roster prvi-roster">
          {playerOrder(pub).map((uid) => (
            <button
              key={uid}
              className={`roster-chip${chosen === uid ? ' picked' : ''}`}
              disabled={Boolean(sent)}
              aria-pressed={chosen === uid}
              onClick={() => {
                sound.pop()
                setPick(uid)
              }}
            >
              <Badge id={pub.players?.[uid]?.badge} size="sm" />
              <span>{nameOf(pub, uid)}</span>
              {uid === me && <small className="muted">ti</small>}
            </button>
          ))}
        </div>
      </div>
      {!sent && (
        <Button
          disabled={!pick}
          onClick={() => {
            if (!pick) return
            sound.lock()
            return actions.vote(pick)
          }}
        >
          {pick ? `Glasam za ${pick === me ? 'sebe' : nameOf(pub, pick)} 👉` : 'Izaberi drugara'}
        </Button>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={votes} label="Glasalo" />
      </div>
    </section>
  )
}

/** A short drum roll on the host phone, then who got which votes. */
function Reveal({ pub, me, isHost, actions }: ScreenProps) {
  const result = prviOf(pub).result
  const prompt = currentPrompt(pub)
  const top = asList<string>(result?.top)
  const counts = result?.counts ?? {}
  const [shown, setShown] = useState(false)
  const played = useRef(false)
  const mine = result?.gains[me]?.points ?? 0

  useEffect(() => {
    if (isHost && !played.current) sound.drumRoll()
    played.current = true
    const t = setTimeout(() => setShown(true), 1500)
    return () => clearTimeout(t)
  }, [isHost])

  useEffect(() => {
    if (!shown) return
    ;(isHost ? sound.cheer : mine > 0 ? sound.correct : sound.wrong)()
  }, [shown, isHost, mine])

  if (!shown)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <div className="drumroll">
          <div className="spotlight" />
          <h1 className="title chrome">{prompt.q}</h1>
          <div className="drum">🥁</div>
        </div>
      </section>
    )

  const picked = playerOrder(pub)
    .filter((uid) => (counts[uid] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
  const scorers = playerOrder(pub).filter((uid) => (result?.gains[uid]?.points ?? 0) > 0)

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className="card center prompt">
        <small className="label">{prompt.q.toUpperCase()}</small>
        {top.length ? (
          <>
            <div className="prvi-crown">🏆</div>
            <p className="prompt-text prvi-title-name">{prompt.title}</p>
            <div className="prvi-holders">
              {top.map((uid) => (
                <PlayerTag key={uid} player={pub.players?.[uid]} you={uid === me} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="prompt-text">Ekipa se ne slaže!</p>
            <small className="muted">Svako je dobio po jedan glas. Nema poena ni titule.</small>
          </>
        )}
      </div>
      <div className="card">
        <h2>Ko je za koga glasao</h2>
        <ul className="prvi-tally">
          {picked.map((uid) => (
            <li key={uid} className={top.includes(uid) ? 'prvi-lead' : ''}>
              <div className="prvi-tally-head">
                <PlayerTag player={pub.players?.[uid]} you={uid === me} />
                <b className="prvi-count">{counts[uid]}</b>
              </div>
              <small className="prvi-voters">
                ← {votersFor(pub, uid).map((v) => (v === me ? 'ti' : nameOf(pub, v))).join(', ')}
              </small>
            </li>
          ))}
        </ul>
      </div>
      <div className="card center">
        {scorers.length ? (
          <p className="prvi-scorers">
            <b className="plus">+1</b> {scorers.map((uid) => (uid === me ? 'ti' : nameOf(pub, uid))).join(', ')}
          </p>
        ) : (
          <p className="prvi-scorers muted">Niko ne dobija poen.</p>
        )}
      </div>
      <ScoreTable pub={pub} me={me} />
      {isHost ? (
        <Button onClick={actions.next}>{isFinalRound(pub) ? 'Proglasi pobednika 👑' : 'Sledeće pitanje 💥'}</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} nastavi</Waiting>
      )}
    </section>
  )
}

function GameOver({ pub, me, isHost, actions }: ScreenProps) {
  const holders = playerOrder(pub)
    .map((uid) => ({ uid, titles: titlesOf(pub, uid) }))
    .filter((h) => h.titles.length > 0)
    .sort((a, b) => b.titles.length - a.titles.length)
  return (
    <Winner {...{ pub, me, isHost }} one="najbolje čita ekipu!" many="dele titulu glasa naroda!" onNewGame={actions.newGame}>
      <div className="card">
        <h2>Titule večeri</h2>
        {holders.length ? (
          <ul className="prvi-titles">
            {holders.map(({ uid, titles }) => (
              <li key={uid}>
                <PlayerTag player={pub.players?.[uid]} you={uid === me} />
                <span className="prvi-title-list">{titles.map((t) => t.title).join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <small className="muted">Ekipa se ni oko čega nije složila. Bravo!</small>
        )}
      </div>
    </Winner>
  )
}
