import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import { BLANK, type BlefQuestion } from '../data/blefQuestions'
import {
  blefOf,
  currentQuestion,
  isFinalRound,
  isTruth,
  MAX_LIE_LENGTH,
  optionsOf,
  TOTAL_QUESTIONS,
} from '../blef/logic'
import { useBlefActions, type BlefActions } from '../blef/room'
import { asList, playerOrder } from '../game/logic'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
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
  actions: BlefActions
  code: string
}

export function Blef({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useBlefActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return <Lobby {...common} />
    case 'write':
      return <Write {...common} />
    case 'pick':
      return <Pick {...common} />
    case 'truth':
      return <Truth {...common} />
    case 'over':
      return <GameOver {...common} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function Lobby({ pub, me, isHost, actions, code }: ScreenProps) {
  return (
    <PartyLobby
      {...{ pub, me, isHost, code }}
      title="Blef"
      steps={[
        'Stiže čudna, ali istinita činjenica sa rupom.',
        'Svako napiše lažan odgovor koji zvuči istinito.',
        `Pronađi pravi odgovor među lažima. ${TOTAL_QUESTIONS} pitanja, poslednje nosi duple poene.`,
      ]}
      onKick={actions.kick}
      onStart={actions.start}
    />
  )
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="round-title">
      PITANJE {pub.round} / {TOTAL_QUESTIONS}
      {isFinalRound(pub) && <span className="double"> · DUPLI POENI 🔥</span>}
    </div>
  )
}

/** The fact with its blank; the blank shows the real answer once revealed. */
function QuestionCard({ question, answer }: { question: BlefQuestion; answer?: string }) {
  const [before, after = ''] = question.q.split(BLANK)
  return (
    <div className="card question">
      <p>
        {before}
        <span className={`blank${answer ? ' filled' : ''}`}>{answer ?? '______'}</span>
        {after}
      </p>
    </div>
  )
}


function Write({ pub, me, isHost, actions }: ScreenProps) {
  const question = currentQuestion(pub)
  const lies = blefOf(pub).lies ?? {}
  const mine = lies[me]
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const someDone = Object.keys(lies).length > 0

  const send = async () => {
    if (isTruth(question, text)) {
      setError('To je baš pravi odgovor! 🤫 Smisli nešto lažno.')
      return
    }
    setError('')
    await actions.writeLie(text)
  }

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <QuestionCard question={question} />
      <Hint pub={pub}>
        Napiši lažan odgovor koji zvuči istinito. Svaki drugar koji ga izabere donosi ti poen.
      </Hint>
      {mine ? (
        <div className="card center">
          <small className="label">TVOJA LAŽ</small>
          <div className="my-lie">{mine}</div>
        </div>
      ) : (
        <div className="card">
          <h2>Tvoja laž</h2>
          <input
            className="name-input"
            value={text}
            maxLength={MAX_LIE_LENGTH}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && text.trim() && void send()}
            placeholder="npr. papagaja"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="send"
          />
          {error && <p className="error">{error}</p>}
          <Button disabled={!text.trim()} onClick={send}>
            Pošalji laž 🤥
          </Button>
        </div>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={lies} label="Napisalo" />
        {isHost && someDone && (
          <button className="link-btn" onClick={actions.closeWriting}>
            Ne čekaj ostale
          </button>
        )}
      </div>
    </section>
  )
}

function Pick({ pub, me, isHost, actions }: ScreenProps) {
  const question = currentQuestion(pub)
  const picks = blefOf(pub).picks ?? {}
  const picked = picks[me]
  const [choice, setChoice] = useState('')
  const options = optionsOf(pub)

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <QuestionCard question={question} />
      <Hint pub={pub}>Jedan od ovih odgovora je istina. Pronađi ga za +2. Ostalo su laži.</Hint>
      <div className="vote-list">
        {options.map((o) => {
          const own = asList<string>(o.owners).includes(me)
          const on = (picked || choice) === o.id
          return (
            <button
              key={o.id}
              className={`vote answer${on ? ' on' : ''}${own ? ' own' : ''}`}
              disabled={own || Boolean(picked)}
              onClick={() => setChoice(o.id)}
            >
              <span>{o.text}</span>
              {own ? <small className="muted">tvoja laž</small> : on && <span className="check">✓</span>}
            </button>
          )
        })}
      </div>
      {!picked && (
        <Button disabled={!choice} onClick={() => actions.pick(choice)}>
          {choice ? 'To je istina! ✅' : 'Izaberi odgovor'}
        </Button>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={picks} label="Izabralo" />
        {isHost && Object.keys(picks).length > 0 && !playerOrder(pub).every((uid) => picks[uid]) && (
          <button className="link-btn" onClick={actions.closePicking}>
            Ne čekaj ostale
          </button>
        )}
      </div>
    </section>
  )
}

/** Drum roll on the host phone, then every answer is unmasked one by one, the truth last. */
function Truth({ pub, me, isHost, actions }: ScreenProps) {
  const question = currentQuestion(pub)
  const { picks = {}, result } = blefOf(pub)
  const [shown, setShown] = useState(false)
  const played = useRef(false)

  useEffect(() => {
    if (isHost && !played.current) sound.drumRoll()
    played.current = true
    const t = setTimeout(() => setShown(true), 2000)
    return () => clearTimeout(t)
  }, [isHost])

  const kindOrder = { lie: 0, house: 1, truth: 2 }
  const options = [...optionsOf(pub)].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
  const truthDelay = options.length * 0.9
  useEffect(() => {
    if (!shown || !isHost) return
    const t = setTimeout(() => sound.cheer(), truthDelay * 1000)
    return () => clearTimeout(t)
  }, [shown, isHost, truthDelay])

  if (!shown)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <div className="drumroll">
          <div className="spotlight" />
          <h1 className="title chrome">Istina je…</h1>
          <div className="drum">🥁</div>
        </div>
      </section>
    )

  const order = playerOrder(pub)
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className="answers">
        {options.map((o, i) => {
          const pickers = order.filter((uid) => picks[uid] === o.id)
          const owners = asList<string>(o.owners)
          return (
            <div key={o.id} className={`answer-card ${o.kind}`} style={{ animationDelay: `${i * 0.9}s` }}>
              <div className="answer-text">{o.text}</div>
              <div className="answer-who">
                {o.kind === 'truth' ? (
                  <b className="truth-tag">ISTINA ✅</b>
                ) : o.kind === 'house' ? (
                  <span className="muted">Laž kuće 🏠</span>
                ) : (
                  <span className="liars">
                    Laž:{' '}
                    {owners.map((uid) => (
                      <PlayerTag key={uid} player={pub.players?.[uid]} you={uid === me} />
                    ))}
                  </span>
                )}
              </div>
              {pickers.length > 0 && (
                <div className="answer-pickers">
                  <small className="muted">{o.kind === 'truth' ? 'pronašli:' : 'nasela:'}</small>
                  {pickers.map((uid) => (
                    <Badge key={uid} id={pub.players?.[uid]?.badge} size="sm" />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="after-reveal" style={{ animationDelay: `${truthDelay}s` }}>
        <QuestionCard question={question} answer={question.a} />
        {result && <RoundGains pub={pub} me={me} title="Ovo pitanje" gains={result.gains} />}
        <ScoreTable pub={pub} me={me} />
        {isHost ? (
          <Button onClick={actions.next}>{isFinalRound(pub) ? 'Proglasi pobednika 👑' : 'Sledeće pitanje ✈️'}</Button>
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
      one="je najveći lažov!"
      many="dele titulu najvećeg lažova!"
      onNewGame={actions.newGame}
    />
  )
}

