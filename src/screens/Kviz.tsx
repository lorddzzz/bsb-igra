import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { Backend } from '../backend'
import { TOPIC_LABELS } from '../data/kvizQuestions'
import type { RoomView } from '../game/room'
import { asList, playerOrder } from '../game/logic'
import type { Pub } from '../game/types'
import { getCard, SPECIALS, type CardId } from '../kviz/cards'
import {
  ANSWER_SECONDS,
  answerMs,
  attackOn,
  BLUR_MS,
  currentQuestion,
  handOf,
  hasAttacked,
  kvizOf,
  LATE_MS,
  myTimeLeft,
  optionsOf,
  QUESTIONS_PER_GAME,
  REVEAL_SECONDS,
  specialOf,
  targets,
  timeLeft,
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
            `Tačan odgovor je 1 poen, brzina se ne računa. Igra ima ${QUESTIONS_PER_GAME} pitanja: Backstreet Boys, Evropa, srpska istorija i Srbija danas.`,
            'Svako ima 2 džokera za napad: tokom pitanja zamrzni, zamagli ili okreni naopako ekran drugaru koji još nije odgovorio. Poslednji posle 5. i 10. pitanja dobija novi.',
            'Tri pitanja su specijalne runde: Dupli poeni, Munja, Haos ili Pljačka.',
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
  const q = currentQuestion(pub)
  const special = specialOf(pub)
  return (
    <div className="kv-top">
      <span className="round-title">
        PITANJE {pub.round} / {totalQuestions(pub)}
      </span>
      <span className="pill">
        {special && <span className="kv-special">{SPECIALS[special].icon} {SPECIALS[special].name} · </span>}
        {TOPIC_LABELS[q.topic]}
        {q.level === 3 && <span className="kv-hard"> · teško 🔥</span>}
      </span>
    </div>
  )
}

const VOWELS = /[aeiouAEIOU]/g
const RAIN = ['🕺', '🎤', '💿', '🕶️', '⭐', '💃', '🎶', '💖']
/** Mešalica moves the options this often. */
const SHUFFLE_MS = 1500
/** Kap po kap shows one more word this often. */
const WORD_MS = 350

function Question({ pub, me, isHost, actions }: ScreenProps) {
  const now = actions.now
  const q = currentQuestion(pub)
  const { texts } = optionsOf(pub)
  const answers = kvizOf(pub).answers ?? {}
  const mine = answers[me]
  const length = answerMs(pub)
  const total = timeLeft(pub, now)
  const leading = total > length
  const special = specialOf(pub)
  const attack = attackOn(pub, me)
  const since = attack ? Math.max(0, now - attack.at) : 0
  const left = Math.min(myTimeLeft(pub, me, now), length)
  const seconds = Math.ceil(left / 1000)
  const over = left <= 0
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null)

  // Stage-speaker tick for the last three seconds, on the host phone only.
  const ticked = useRef(0)
  const allSeconds = Math.ceil(Math.min(total, length) / 1000)
  useEffect(() => {
    if (!isHost || leading || allSeconds <= 0 || allSeconds > 3 || ticked.current === allSeconds) return
    ticked.current = allSeconds
    sound.tick(allSeconds === 1)
  }, [isHost, leading, allSeconds])

  if (leading) {
    const leadIn = Math.ceil((total - length) / 1000)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        {special ? (
          <div className="kv-lead kv-splash">
            <small className="label">SPECIJALNA RUNDA</small>
            <div className="kv-splash-icon">{SPECIALS[special].icon}</div>
            <h1 className="title chrome">{SPECIALS[special].name}</h1>
            <p className="big-line center">{SPECIALS[special].text}</p>
            <small className="muted">počinje za {leadIn}</small>
          </div>
        ) : (
          <div className="kv-lead">
            <small className="label">SPREMI SE</small>
            <div key={leadIn} className="kv-lead-num chrome">
              {leadIn}
            </div>
          </div>
        )}
      </section>
    )
  }

  // What the attack on me does to this screen.
  const card = attack?.card
  let questionText = q.q
  if (card === 'samoglasnici') questionText = q.q.replace(VOWELS, '')
  if (card === 'kap') {
    const words = q.q.split(' ')
    questionText = words.slice(0, Math.floor(since / WORD_MS) + 1).join(' ')
  }
  const blurred = card === 'magla' && since < BLUR_MS
  const late = card === 'kasni' && since < LATE_MS
  const shift = card === 'mesalica' && mine === undefined ? Math.floor(since / SHUFFLE_MS) % 4 : 0
  const shown = [0, 1, 2, 3].map((i) => (i + shift) % 4)
  const fx = card === 'ogledalo' || card === 'naopako' || card === 'sitna' ? ` fx-${card}` : ''

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      {attack && <AttackBanner pub={pub} me={me} />}
      <div className={`kv-timer${seconds <= 3 ? ' hurry' : ''}`}>
        <span className="kv-bar">
          <span style={{ '--p': left / length } as CSSProperties} />
        </span>
        <b>{seconds}</b>
      </div>
      <div
        className={`kv-play${fx}`}
        onPointerMove={card === 'mrak' ? (e) => setSpot(spotAt(e)) : undefined}
        onPointerDown={card === 'mrak' ? (e) => setSpot(spotAt(e)) : undefined}
      >
        <div className={`card kv-question${blurred ? ' fx-blur' : ''}`}>
          <p>{questionText}</p>
        </div>
        <div className="kv-options">
          {shown.map((i) => (
            <button
              key={i}
              className={`kv-option${mine === i ? ' on' : ''}${late ? ' fx-late' : ''}`}
              disabled={mine !== undefined || over || late}
              onClick={() => actions.answer(i)}
            >
              <span className="kv-letter">{LETTERS[i]}</span>
              <span>{late ? '…' : texts[i]}</span>
            </button>
          ))}
        </div>
        {card === 'mrak' && mine === undefined && (
          <div
            className="fx-dark"
            style={{ '--x': `${spot?.x ?? 50}%`, '--y': `${spot?.y ?? 40}%` } as CSSProperties}
          />
        )}
      </div>
      {card === 'kisa' && mine === undefined && <Rain />}
      <Hand pub={pub} me={me} now={now} actions={actions} />
      <Hint pub={pub}>Jedan dodir i odgovor je zaključan. Džokerom napadni drugara koji još nije odgovorio!</Hint>
      <div className="card center">
        <AttackRow pub={pub} />
        <DoneRow pub={pub} done={answers} label={over && mine === undefined ? 'Vreme je isteklo · odgovorilo' : 'Odgovorilo'} />
      </div>
    </section>
  )
}

function spotAt(e: ReactPointerEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
}

function AttackBanner({ pub, me }: { pub: Pub; me: string }) {
  const attack = attackOn(pub, me)
  if (!attack) return null
  const card = getCard(attack.card)
  return (
    <div className="kv-hit">
      <span className="kv-hit-icon">{card.icon}</span>
      <span>
        <b>{card.name}!</b> {attack.from === 'haos' ? 'Haos te je pogodio' : `Napad od: ${nameOf(pub, attack.from)}`}
      </span>
    </div>
  )
}

/** Who is under attack right now, for everyone to see. */
function AttackRow({ pub }: { pub: Pub }) {
  const attacks = Object.entries(kvizOf(pub).attacks ?? {})
  if (!attacks.length) return null
  return (
    <div className="kv-attacks">
      {attacks.map(([victim, a]) => (
        <span key={victim}>
          {a.from === 'haos' ? '🌀' : <Badge id={pub.players?.[a.from]?.badge} size="sm" />}
          <span className="kv-attack-icon">{getCard(a.card).icon}</span>
          <Badge id={pub.players?.[victim]?.badge} size="sm" />
        </span>
      ))}
    </div>
  )
}

/** My attack cards: tap one, then tap the friend to hit. */
function Hand({ pub, me, now, actions }: { pub: Pub; me: string; now: number; actions: KvizActions }) {
  const [picked, setPicked] = useState<CardId | null>(null)
  const hand = handOf(pub, me)
  const used = hasAttacked(pub, me)
  const victims = targets(pub, me, now)
  if (!hand.length) return null
  return (
    <div className="kv-hand">
      <small className="label">{used ? 'DŽOKER ISKORIŠĆEN OVO PITANJE' : 'TVOJI DŽOKERI'}</small>
      <div className="kv-cards">
        {hand.map((id, i) => {
          const c = getCard(id)
          return (
            <button
              key={`${id}-${i}`}
              className={`kv-card${picked === id ? ' on' : ''}`}
              disabled={used || !victims.length}
              onClick={() => setPicked(picked === id ? null : id)}
            >
              <span className="kv-card-icon">{c.icon}</span>
              <b>{c.name}</b>
            </button>
          )
        })}
      </div>
      {picked && !used && (
        <div className="kv-victims">
          <small className="muted">{getCard(picked).effect}. Koga?</small>
          <div className="kv-victim-row">
            {victims.map((uid) => (
              <button
                key={uid}
                className="kv-victim"
                onClick={() => {
                  void actions.attack(picked, uid)
                  setPicked(null)
                }}
              >
                <Badge id={pub.players?.[uid]?.badge} size="md" />
                <span>{nameOf(pub, uid)}</span>
              </button>
            ))}
            {!victims.length && <small className="muted">Nema koga, svi su odgovorili ili su već napadnuti.</small>}
          </div>
        </div>
      )}
    </div>
  )
}

function Rain() {
  const drops = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        emoji: RAIN[i % RAIN.length],
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 1.6 + Math.random() * 1.6,
        size: 34 + Math.random() * 34,
      })),
    [],
  )
  return (
    <div className="fx-rain" aria-hidden>
      {drops.map((d, i) => (
        <span
          key={i}
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            fontSize: `${d.size}px`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
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
  const revealLeft = (kvizOf(pub).nextAt ?? 0) - actions.now

  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    if (right === order.length) sound.cheer()
    else if (right === 0) sound.scratch()
  }, [isHost, right, order.length])

  const bonus = asList<string>(result?.bonus)
  const thieves = order.filter((uid) => asList<string>(result?.gains[uid]?.reasons).includes('Pljačka'))
  const gained = result?.gains[me]?.points ?? 0
  const verdict =
    mine === undefined ? 'Nisi stigao ⏱' : mine === correct ? `Tačno! +${gained}` : gained < 0 ? `Netačno · ${gained}` : 'Netačno'
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
      {thieves.length > 0 && (
        <p className="kv-note">💰 Pljačka! {thieves.map((uid) => nameOf(pub, uid)).join(', ')} otima od vođe.</p>
      )}
      {bonus.length > 0 && (
        <p className="kv-note">🎴 Novi džoker za poslednje: {bonus.map((uid) => nameOf(pub, uid)).join(', ')}</p>
      )}
      <div className="kv-next">
        <span className="kv-bar">
          <span style={{ '--p': Math.min(1, Math.max(0, revealLeft / (REVEAL_SECONDS * 1000))) } as CSSProperties} />
        </span>
        <small className="muted">{last ? 'Još samo tabela…' : 'Sledeće pitanje stiže'}</small>
      </div>
      <ScoreTable pub={pub} me={me} />
      {!isHost && revealLeft < -2000 && (
        <p className="muted center">Čekamo telefon od {nameOf(pub, pub.hostUid)}…</p>
      )}
    </section>
  )
}
