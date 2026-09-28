import { useEffect, useRef, type CSSProperties } from 'react'
import type { Backend } from '../backend'
import { TOPIC_LABELS } from '../data/kvizQuestions'
import type { RoomView } from '../game/room'
import { playerOrder } from '../game/logic'
import type { Pub } from '../game/types'
import {
  ANSWER_SECONDS,
  currentQuestion,
  kvizOf,
  leadSeconds,
  optionsOf,
  QUESTIONS_PER_GAME,
  REVEAL_SECONDS,
  totalQuestions,
} from '../kviz/logic'
import { useKvizActions, type KvizActions } from '../kviz/room'
import { Badge, Hint, nameOf, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import { DoneRow, PartyLobby, ScoreTable, Winner } from './shared'

const LETTERS = ['A', 'B', 'C', 'D']

interface Props {
  be: Backend
  code: string
  view: RoomView
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: KvizActions
  code: string
}

export function Kviz({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useKvizActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return (
        <PartyLobby
          {...common}
          title="Kviz"
          steps={[
            `Svi dobijaju isto pitanje u isto vreme, sa 4 ponuđena odgovora.`,
            `Imate samo ${ANSWER_SECONDS} sekundi. Jedan dodir, bez predomišljanja!`,
            `Tačan odgovor je 1 poen, brzina se ne računa. Igra ima ${QUESTIONS_PER_GAME} pitanja.`,
          ]}
          onKick={actions.kick}
          onStart={actions.start}
        />
      )
    case 'question':
      return <Question {...common} />
    case 'answer':
      return <Answer {...common} />
    case 'over':
      return <Winner {...common} one="je kviz šampion!" many="dele titulu kviz šampiona!" onNewGame={actions.newGame} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="kv-top">
      <span className="round-title">
        PITANJE {pub.round} / {totalQuestions(pub)}
      </span>
      <span className="pill">{TOPIC_LABELS[currentQuestion(pub).topic]}</span>
    </div>
  )
}

function Question({ pub, me, isHost, actions }: ScreenProps) {
  const q = currentQuestion(pub)
  const { texts } = optionsOf(pub)
  const answers = kvizOf(pub).answers ?? {}
  const mine = answers[me]
  const lead = leadSeconds(pub.round) * 1000
  const left = Math.max(0, ANSWER_SECONDS * 1000 - (actions.elapsed - lead))
  const seconds = Math.ceil(left / 1000)
  const leading = actions.elapsed < lead
  const over = left <= 0

  // Stage-speaker tick for the last three seconds, on the host phone only.
  const ticked = useRef(0)
  useEffect(() => {
    if (!isHost || leading || over || seconds > 3 || ticked.current === seconds) return
    ticked.current = seconds
    sound.tick(seconds === 1)
  }, [isHost, leading, over, seconds])

  if (leading)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <div className="kv-lead">
          <small className="label">SPREMI SE</small>
          <div key={Math.ceil((lead - actions.elapsed) / 1000)} className="kv-lead-num chrome">
            {Math.ceil((lead - actions.elapsed) / 1000)}
          </div>
        </div>
      </section>
    )

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <div className={`kv-timer${seconds <= 3 ? ' hurry' : ''}`}>
        <span className="kv-bar">
          <span style={{ '--p': left / (ANSWER_SECONDS * 1000) } as CSSProperties} />
        </span>
        <b>{seconds}</b>
      </div>
      <div className="card kv-question">
        <p>{q.q}</p>
      </div>
      <div className="kv-options">
        {texts.map((text, i) => (
          <button
            key={i}
            className={`kv-option${mine === i ? ' on' : ''}`}
            disabled={mine !== undefined || over}
            onClick={() => actions.answer(i)}
          >
            <span className="kv-letter">{LETTERS[i]}</span>
            <span>{text}</span>
          </button>
        ))}
      </div>
      <Hint pub={pub}>Jedan dodir i odgovor je zaključan. Brzina ne donosi poene, samo tačnost.</Hint>
      <div className="card center">
        <DoneRow pub={pub} done={answers} label={over && mine === undefined ? 'Vreme je isteklo · odgovorilo' : 'Odgovorilo'} />
      </div>
    </section>
  )
}

function Answer({ pub, me, isHost, actions }: ScreenProps) {
  const q = currentQuestion(pub)
  const { texts } = optionsOf(pub)
  const result = kvizOf(pub).result
  const correct = result?.correct ?? optionsOf(pub).correct
  const picks = result?.picks ?? {}
  const mine = picks[me]
  const order = playerOrder(pub)
  const right = order.filter((uid) => picks[uid] === correct).length
  const last = pub.round >= totalQuestions(pub)

  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    if (right === order.length) sound.cheer()
    else if (right === 0) sound.scratch()
  }, [isHost, right, order.length])

  const verdict = mine === undefined ? 'Nisi stigao ⏱' : mine === correct ? 'Tačno! +1' : 'Netačno'
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <h1 className={`title kv-verdict ${mine === correct ? 'good' : 'bad'}`}>{verdict}</h1>
      <div className="card kv-question">
        <p>{q.q}</p>
      </div>
      <div className="kv-options">
        {texts.map((text, i) => {
          const who = order.filter((uid) => picks[uid] === i)
          const cls = i === correct ? ' right' : i === mine ? ' wrong' : ' dim'
          return (
            <div key={i} className={`kv-option${cls}`}>
              <span className="kv-letter">{i === correct ? '✓' : LETTERS[i]}</span>
              <span>{text}</span>
              <span className="kv-who">
                {who.map((uid) => (
                  <Badge key={uid} id={pub.players?.[uid]?.badge} size="sm" />
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <div className="kv-next">
        <span className="kv-bar">
          <span style={{ '--p': Math.max(0, 1 - actions.elapsed / (REVEAL_SECONDS * 1000)) } as CSSProperties} />
        </span>
        <small className="muted">{last ? 'Još samo tabela…' : 'Sledeće pitanje stiže'}</small>
      </div>
      <ScoreTable pub={pub} me={me} />
      {!isHost && actions.elapsed > (REVEAL_SECONDS + 2) * 1000 && (
        <p className="muted center">Čekamo telefon od {nameOf(pub, pub.hostUid)}…</p>
      )}
    </section>
  )
}
