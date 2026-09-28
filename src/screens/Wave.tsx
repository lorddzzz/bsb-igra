import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import { getWaveScale } from '../data/waveScales'
import { asList } from '../game/logic'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { badgeOf, Button, Hint, nameOf, PlayerTag, Waiting } from '../ui/components'
import { Dial, type Needle } from '../ui/Dial'
import * as sound from '../ui/sound'
import { useYourTurn } from '../ui/stageSounds'
import { clueGiver, guessers, MAX_CLUE_LENGTH, totalRounds, TURNS_EACH, waveOf } from '../wave/logic'
import { useWaveActions, type WaveActions } from '../wave/room'
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
  actions: WaveActions
  code: string
}

export function Wave({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useWaveActions(be, code, pub)
  const common = { pub, me: be.uid, isHost: pub.hostUid === be.uid, actions, code }

  switch (pub.phase) {
    case 'lobby':
      return (
        <PartyLobby
          {...common}
          title="Talasna dužina"
          steps={[
            'Jedan igrač vidi tajnu metu na skali, npr. između „hladno” i „vruće”.',
            'Napiše kratak trag, npr. „supa”.',
            `Ostali pomeraju svoju iglu tamo gde misle da je meta. Svako daje trag ${TURNS_EACH} puta.`,
          ]}
          onKick={actions.kick}
          onStart={actions.start}
        />
      )
    case 'clue':
      return <Clue {...common} />
    case 'aim':
      return <Aim {...common} />
    case 'result':
      return <Result {...common} />
    case 'over':
      return (
        <Winner
          {...common}
          one="je najbolje na istoj talasnoj dužini!"
          many="dele pobedu!"
          onNewGame={actions.newGame}
        />
      )
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function RoundTitle({ pub }: { pub: Pub }) {
  return (
    <div className="round-title">
      RUNDA {pub.round} / {totalRounds(pub)}
    </div>
  )
}

function ClueBanner({ pub }: { pub: Pub }) {
  const giver = clueGiver(pub)
  return (
    <div className="card center clue-banner">
      <small className="label">TRAG</small>
      <div className="clue-text">„{waveOf(pub).clue}”</div>
      <PlayerTag player={pub.players?.[giver]} />
    </div>
  )
}

function Clue({ pub, me, actions }: ScreenProps) {
  const giver = clueGiver(pub)
  const { choices, scale, target } = waveOf(pub)
  const [clue, setClue] = useState('')
  useYourTurn(giver === me, pub.round)
  const send = () => {
    sound.lock()
    return actions.giveClue(clue)
  }

  if (giver !== me)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <Hint pub={pub}>
          {nameOf(pub, giver)} vidi tajnu metu na skali i smišlja trag. Zatim ti pomeraš iglu tamo gde misliš da je
          meta.
        </Hint>
        <div className="card center">
          <PlayerTag player={pub.players?.[giver]} />
          <Waiting>{scale ? 'smišlja trag' : 'bira skalu'}</Waiting>
        </div>
        <ScoreTable pub={pub} me={me} />
      </section>
    )

  if (!scale)
    return (
      <section className="screen">
        <RoundTitle pub={pub} />
        <h1 className="title">Ti daješ trag!</h1>
        <p className="muted center">Izaberi skalu:</p>
        <div className="vote-list">
          {asList<string>(choices).map((id) => {
            const s = getWaveScale(id)
            return (
              <button key={id} className="vote scale-choice" onClick={() => {
                  sound.pop()
                  void actions.chooseScale(id)
                }}>
                <span>{s.left}</span>
                <span className="muted">↔</span>
                <span>{s.right}</span>
              </button>
            )
          })}
        </div>
      </section>
    )

  const s = getWaveScale(scale)
  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <h1 className="title">Samo ti vidiš metu 🎯</h1>
      <Dial left={s.left} right={s.right} target={target} />
      <Hint pub={pub}>
        Smisli jednu reč ili kratak pojam koji je na ovoj skali tačno tamo gde je meta. Bez brojeva i bez objašnjavanja!
      </Hint>
      <div className="card">
        <h2>Tvoj trag</h2>
        <input
          className="name-input"
          value={clue}
          maxLength={MAX_CLUE_LENGTH}
          onChange={(e) => setClue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && clue.trim() && void send()}
          placeholder="npr. supa"
          autoComplete="off"
          enterKeyHint="send"
        />
        <Button disabled={!clue.trim()} onClick={send}>
          Pošalji trag 📡
        </Button>
      </div>
    </section>
  )
}

function Aim({ pub, me, isHost, actions }: ScreenProps) {
  const giver = clueGiver(pub)
  const { scale, target, guesses = {} } = waveOf(pub)
  const s = getWaveScale(scale)
  const locked = guesses[me]
  const [value, setValue] = useState(50)
  const aiming = guessers(pub)
  const someDone = aiming.some((uid) => guesses[uid] !== undefined)

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <ClueBanner pub={pub} />
      {giver === me ? (
        <>
          <Dial left={s.left} right={s.right} target={target} />
          <p className="muted center">Drugari nišane. Ne odaji ništa! 🤐</p>
        </>
      ) : locked !== undefined ? (
        <>
          <Dial left={s.left} right={s.right} needles={[{ value: locked, color: badgeOf(pub.players?.[me]?.badge).color }]} />
          <p className="muted center">Zaključano. Čekamo ostale.</p>
        </>
      ) : (
        <>
          <Hint pub={pub}>Prevuci iglu tamo gde misliš da je meta. Pun pogodak je 4 poena.</Hint>
          <Dial left={s.left} right={s.right} value={value} onChange={setValue} />
          <Button
            onClick={() => {
              sound.lock()
              return actions.aim(value)
            }}
          >Zaključaj 🎯</Button>
        </>
      )}
      <div className="card center">
        <DoneRow pub={pub} done={guesses} label="Zaključalo" among={aiming} />
        {isHost && someDone && (
          <button className="link-btn" onClick={actions.closeAim}>
            Ne čekaj ostale
          </button>
        )}
      </div>
    </section>
  )
}

function Result({ pub, me, isHost, actions }: ScreenProps) {
  const { scale, target, guesses = {}, result } = waveOf(pub)
  const s = getWaveScale(scale)
  const needles: Needle[] = guessers(pub)
    .filter((uid) => guesses[uid] !== undefined)
    .map((uid) => {
      const b = badgeOf(pub.players?.[uid]?.badge)
      return { value: guesses[uid], color: b.color, label: b.name.length <= 2 ? b.name : b.name[0] }
    })
  const best = Math.max(0, ...Object.values(result?.gains ?? {}).map((g) => g.points))
  const played = useRef(false)
  useEffect(() => {
    if (!isHost || played.current) return
    played.current = true
    ;(best >= 3 ? sound.cheer : best === 0 ? sound.scratch : sound.nice)()
  }, [isHost, best])
  const last = pub.round >= totalRounds(pub)

  return (
    <section className="screen">
      <RoundTitle pub={pub} />
      <ClueBanner pub={pub} />
      <Dial left={s.left} right={s.right} target={target} needles={needles} />
      {best === 4 && <h1 className="title chrome">Pun pogodak! 🎯</h1>}
      {result && <RoundGains pub={pub} me={me} title="Ova runda" gains={result.gains} />}
      <ScoreTable pub={pub} me={me} />
      {isHost ? (
        <Button onClick={actions.next}>{last ? 'Proglasi pobednika 👑' : 'Sledeća runda ✈️'}</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} nastavi</Waiting>
      )}
      {!last && <p className="muted center">Sledeći trag daje: {nameOf(pub, clueGiver({ ...pub, round: pub.round + 1 }))}</p>}
    </section>
  )
}
