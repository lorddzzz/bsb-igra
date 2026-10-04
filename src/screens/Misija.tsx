import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Backend } from '../backend'
import { playerOrder } from '../game/logic'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import {
  failsNeeded,
  FORCED_AFTER,
  introScript,
  isForced,
  leader,
  maxSpecials,
  MIN_MISIJA_PLAYERS,
  misijaOf,
  missionNo,
  mKey,
  ROLES,
  SPECIAL_ORDER,
  sideOf,
  spyCount,
  specialsIn,
  teamOf,
  teamSize,
  track,
  TO_WIN,
  wins,
} from '../misija/logic'
import { misijaSecret, misijaTicket, useMisijaActions, type MisijaActions } from '../misija/room'
import type { MisijaSecret, MisijaTicket, Role, Side } from '../misija/types'
import { Badge, badgeOf, Button, Hint, nameOf, PlayerTag, Waiting } from '../ui/components'
import * as sound from '../ui/sound'
import * as speech from '../ui/speech'
import { useYourTurn } from '../ui/stageSounds'
import { DoneRow, PartyLobby } from './shared'

interface Props {
  be: Backend
  code: string
  view: RoomView
}

interface ScreenProps {
  pub: Pub
  me: string
  isHost: boolean
  actions: MisijaActions
  code: string
  ticket: MisijaTicket | null
  secret: MisijaSecret | null
}

const SIDE_NAME: Record<Side, string> = { ekipa: 'Ekipa', spijuni: 'Špijuni' }

export function Misija({ be, code, view }: Props) {
  const pub = view.pub!
  const actions = useMisijaActions(be, code, view)
  const common: ScreenProps = {
    pub,
    me: be.uid,
    isHost: pub.hostUid === be.uid,
    actions,
    code,
    ticket: misijaTicket(view),
    secret: misijaSecret(view),
  }

  switch (pub.phase) {
    case 'lobby':
      return <Lobby {...common} />
    case 'intro':
      return <Intro {...common} />
    case 'team':
      return <TeamPick {...common} />
    case 'vote':
      return <Vote {...common} />
    case 'mission':
      return <Mission {...common} />
    case 'reveal':
      return <Reveal {...common} />
    case 'guess':
      return <Guess {...common} />
    case 'over':
      return <Over {...common} />
    default:
      return <Waiting>Učitavanje</Waiting>
  }
}

function Lobby({ pub, me, isHost, actions, code }: ScreenProps) {
  const n = playerOrder(pub).length
  const max = maxSpecials(Math.max(n, MIN_MISIJA_PLAYERS))
  const level = Math.min(misijaOf(pub).specials ?? 0, max)
  return (
    <PartyLobby
      pub={pub}
      me={me}
      isHost={isHost}
      code={code}
      title="Misija"
      minPlayers={MIN_MISIJA_PLAYERS}
      steps={[
        `Svako dobija tajnu ulogu. Oko trećine vas su špijuni${n >= MIN_MISIJA_PLAYERS ? ` (sada ${spyCount(n)})` : ''}.`,
        'Vođa bira tim za misiju, svi glasaju da li tim ide.',
        'Tim tajno igra Uspeh ili Sabotažu. Ko prvi skupi 3 misije, pobeđuje.',
      ]}
      onKick={actions.kick}
      onStart={() => {
        speech.prime()
        return actions.start()
      }}
    >
      <div className="card">
        <h2>Specijalne uloge</h2>
        {isHost && (
          <div className="level-row" role="radiogroup" aria-label="Broj specijalnih uloga">
            {Array.from({ length: max + 1 }, (_, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={i === level}
                className={`level-btn${i === level ? ' on' : ''}`}
                onClick={() => actions.setSpecials(i)}
              >
                {i}
              </button>
            ))}
          </div>
        )}
        <ul className="role-ladder">
          {SPECIAL_ORDER.slice(0, max).map((r, i) => (
            <li key={r} className={i < level ? 'on' : ''}>
              <span className="role-icon">{ROLES[r].icon}</span>
              <span>
                <b>{ROLES[r].name}</b> <small className={`side-${ROLES[r].side}`}>{SIDE_NAME[ROLES[r].side]}</small>
                <br />
                <small className="muted">{ROLES[r].text}</small>
              </span>
            </li>
          ))}
        </ul>
        {level === 0 && <p className="muted">Bez specijalnih uloga: samo ekipa i špijuni.</p>}
        {max < SPECIAL_ORDER.length && n > 0 && (
          <p className="muted">
            <small>Samotnjak dolazi tek kad ima 3 špijuna, od 7 igrača.</small>
          </p>
        )}
      </div>
    </PartyLobby>
  )
}

/**
 * The narrator's opening, before the first team pick. The host phone reads it out loud with the
 * phone's Serbian (or Croatian) voice; without one, the host reads the lines from the screen.
 */
function Intro({ pub, me, isHost, actions, ticket }: ScreenProps) {
  const lines = introScript(specialsIn(pub), nameOf(pub, leader(pub)))
  const [at, setAt] = useState(0)
  const [voiced, setVoiced] = useState<boolean | null>(null)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (!isHost) return
    let gone = false
    void speech.voicesReady().then(() => !gone && setVoiced(speech.canSpeak()))
    return () => {
      gone = true
    }
  }, [isHost])

  // Read the whole script, waiting after each line for the players to do what it says.
  useEffect(() => {
    if (!isHost || !voiced) return
    let gone = false
    const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000))
    void (async () => {
      await wait(2.5) // let the boarding call finish
      for (let i = 0; i < lines.length && !gone; i++) {
        setAt(i)
        sound.duckMusic(lines[i].pause + 6)
        await speech.say(lines[i].text)
        if (!gone) await wait(lines[i].pause)
      }
      if (!gone) void actions.endIntro()
    })()
    return () => {
      gone = true
      speech.stop()
    }
    // the script is fixed for the game; `run` restarts it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, voiced, run])

  if (!isHost)
    return (
      <section className="screen">
        <h1 className="title">Slušajte naratora 🎙️</h1>
        <Hint pub={pub}>Kad narator kaže, drži kartu da vidiš svoju ulogu. Posle spusti telefon i radi šta kaže.</Hint>
        <RoleCard pub={pub} me={me} ticket={ticket} />
        <Waiting>Uvod u igru</Waiting>
      </section>
    )

  const last = at >= lines.length - 1
  return (
    <section className="screen">
      <h1 className="title">{voiced === null ? 'Narator 🎙️' : voiced ? 'Narator čita 🎙️' : 'Ti si narator 🎙️'}</h1>
      {voiced === false && (
        <p className="muted center">Ovaj telefon ne može da čita naglas (nema srpski ili hrvatski glas, ili je zvuk isključen). Pročitaj ti, red po red.</p>
      )}
      <div className="card center narrator">
        <small className="label">
          {at + 1} / {lines.length}
        </small>
        <div className="narrator-line">{lines[at].text}</div>
      </div>
      {voiced === false &&
        (last ? (
          <Button onClick={actions.endIntro}>Počni prvu misiju 🚀</Button>
        ) : (
          <Button onClick={() => setAt(at + 1)}>Dalje ▶</Button>
        ))}
      {voiced && (
        <button
          className="link-btn"
          onClick={() => {
            speech.stop()
            speech.prime()
            setRun(run + 1)
          }}
        >
          Ne čuje se? Pusti ponovo
        </button>
      )}
      <RoleCard pub={pub} me={me} ticket={ticket} />
      <button className="link-btn" onClick={actions.endIntro}>
        Preskoči uvod
      </button>
    </section>
  )
}

/** Five mission slots: team size, and the result once played. */
function Track({ pub }: { pub: Pub }) {
  const n = playerOrder(pub).length
  const current = missionNo(pub)
  const results = track(pub)
  const rejects = misijaOf(pub).rejects ?? 0
  return (
    <div className="card mission-track">
      <div className="track-row">
        {results.map((r, i) => (
          <div
            key={i}
            className={`track-slot${r ? (r.ok ? ' ok' : ' bad') : ''}${!r && i + 1 === current ? ' now' : ''}`}
          >
            <span className="track-mark">{r ? (r.ok ? '✓' : '✗') : teamSize(n, i + 1)}</span>
            {failsNeeded(n, i + 1) > 1 && <small>2✗</small>}
          </div>
        ))}
      </div>
      <div className="track-foot">
        <span>MISIJA {Math.min(current, 5)} / 5</span>
        <span className={rejects >= FORCED_AFTER - 1 ? 'warn' : ''}>
          Odbijeno: {rejects}/{FORCED_AFTER + 1}
        </span>
      </div>
    </div>
  )
}

/** Press and hold to see your role; it hides the moment you let go. */
function RoleCard({ pub, me, ticket }: { pub: Pub; me: string; ticket: MisijaTicket | null }) {
  const [peek, setPeek] = useState(false)
  useEffect(() => {
    const hide = () => setPeek(false)
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [])
  const role = ticket ? ROLES[ticket.role] : null
  const sees = ticket?.sees ?? []
  const player = pub.players?.[me]

  return (
    <div
      className={`ticket role-card${peek && ticket ? ' peek' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        setPeek(true)
      }}
      onPointerUp={() => setPeek(false)}
      onPointerCancel={() => setPeek(false)}
      onPointerLeave={() => setPeek(false)}
      onContextMenu={(e) => e.preventDefault()}
      role="button"
      aria-label="Drži da vidiš svoju ulogu"
    >
      <div className="ticket-inner">
        <div className="ticket-face ticket-front">
          <div className="ticket-top">
            <span className="airline">MISIJA DRUŽINA</span>
            <span className="flight">STROGO POVERLJIVO</span>
          </div>
          <div className="ticket-mid">
            <div className="ticket-field">
              <small>AGENT</small>
              <b>{player?.name ?? '—'}</b>
            </div>
            <div className="ticket-field">
              <small>ZNAK</small>
              <b className="seat">
                <Badge id={player?.badge} size="sm" />
              </b>
            </div>
          </div>
          <div className="perforation" />
          <div className="ticket-hold">{ticket ? '👆 DRŽI DA VIDIŠ ULOGU' : 'Uloga se štampa…'}</div>
          <div className="barcode" aria-hidden />
        </div>
        <div className="ticket-face ticket-back">
          {ticket && role && (
            <>
              <small className="ticket-cat">{SIDE_NAME[role.side].toUpperCase()}</small>
              <div className={`ticket-word role-name${role.side === 'spijuni' ? ' impostor' : ''}`}>
                {role.icon} {role.name}
              </div>
              {sees.length > 0 && (
                <div className="role-sees">
                  <small>{seesLabel(ticket.role)}</small>
                  <div>
                    {sees.map((uid) => (
                      <span key={uid} className="seen">
                        <Badge id={pub.players?.[uid]?.badge} size="sm" /> {nameOf(pub, uid)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <small className="role-text">{role.text}</small>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function seesLabel(role: Role): string {
  if (role === 'menadzer') return 'ŠPIJUNI'
  if (role === 'telohranitelj') return 'JEDAN OD OVIH JE MENADŽER'
  return 'TVOJI SAUČESNICI'
}

function Players({
  pub,
  uids,
  picked,
  onPick,
}: {
  pub: Pub
  uids: string[]
  picked?: Record<string, boolean>
  onPick?: (uid: string) => void
}) {
  return (
    <div className="badge-grid">
      {uids.map((uid) => {
        const b = badgeOf(pub.players?.[uid]?.badge)
        return (
          <button
            key={uid}
            className={`badge-pick${picked?.[uid] ? ' on' : ''}`}
            style={{ '--c': b.color } as CSSProperties}
            disabled={!onPick}
            onClick={() => {
              sound.pop()
              onPick?.(uid)
            }}
          >
            <Badge id={b.id} size="md" />
            <span>{nameOf(pub, uid)}</span>
          </button>
        )
      })}
    </div>
  )
}

function TeamRow({ pub, team }: { pub: Pub; team: Record<string, boolean> | undefined }) {
  return (
    <div className="team-row">
      {teamOf(team).map((uid) => (
        <PlayerTag key={uid} player={pub.players?.[uid]} />
      ))}
    </div>
  )
}

/** How the last team vote went: who voted for and against. */
function LastVote({ pub }: { pub: Pub }) {
  const v = misijaOf(pub).lastVote
  if (!v || v.mission !== missionNo(pub)) return null
  const votes = v.votes ?? {}
  return (
    <div className="card">
      <h2>
        Prošli predlog ({nameOf(pub, v.leader)}): {v.approved ? 'prošao' : 'odbijen'}
      </h2>
      <TeamRow pub={pub} team={v.team} />
      {v.votes && (
        <div className="vote-split">
          {playerOrder(pub).map((uid) => (
            <span key={uid} className={votes[uid] ? 'yes' : 'no'}>
              <Badge id={pub.players?.[uid]?.badge} size="sm" />
              {votes[uid] ? '👍' : '👎'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamPick({ pub, me, actions, ticket }: ScreenProps) {
  const lead = leader(pub)
  const size = teamSize(playerOrder(pub).length, missionNo(pub))
  const team = misijaOf(pub).team ?? {}
  const count = teamOf(team).length
  const forced = isForced(pub)
  useYourTurn(lead === me, `${pub.round}-${misijaOf(pub).turn}`)

  return (
    <section className="screen">
      <Track pub={pub} />
      {lead === me ? (
        <>
          <h1 className="title">Ti si vođa! 🎙️</h1>
          <Hint pub={pub}>
            Pitaj ostale koga da vodiš, pa izaberi tim. Možeš da izabereš i sebe. Posle svi glasaju da li tim ide.
          </Hint>
          {forced && <p className="warn center">Peti predlog: ovaj tim ide na misiju bez glasanja!</p>}
          <div className="card">
            <h2>
              Izaberi {size} za misiju ({count}/{size})
            </h2>
            <Players
              pub={pub}
              uids={playerOrder(pub)}
              picked={team}
              onPick={(uid) => (team[uid] || count < size) && actions.toggle(uid)}
            />
          </div>
          <Button disabled={count !== size} onClick={actions.propose}>
            {forced ? 'Šalji tim na misiju 🚀' : 'Predloži tim 🗳️'}
          </Button>
        </>
      ) : (
        <>
          <div className="card center">
            <small className="label">VOĐA</small>
            <PlayerTag player={pub.players?.[lead]} />
            <Waiting>bira tim od {size}</Waiting>
            {count > 0 && <TeamRow pub={pub} team={team} />}
          </div>
          <Hint pub={pub}>
            Spusti telefon i pričajte! Ubedi vođu koga da povede. Ekipa želi uspeh, špijuni sabotažu.
          </Hint>
          {forced && <p className="warn center">Peti predlog: ovaj tim ide bez glasanja.</p>}
        </>
      )}
      <LastVote pub={pub} />
      <RoleCard pub={pub} me={me} ticket={ticket} />
    </section>
  )
}

function Vote({ pub, me, actions, ticket }: ScreenProps) {
  const m = misijaOf(pub)
  const mine = m.votes?.[me]
  return (
    <section className="screen">
      <Track pub={pub} />
      <div className="card center">
        <small className="label">PREDLOG: {nameOf(pub, leader(pub)).toUpperCase()}</small>
        <TeamRow pub={pub} team={m.team} />
      </div>
      <Hint pub={pub}>
        Da li ovaj tim ide na misiju? Glasovi se vide tek kad svi glasaju. Treba više od pola „za”.
      </Hint>
      <div className="yes-no">
        <button
          className={`vote-big yes${mine === true ? ' on' : ''}`}
          onClick={() => {
            sound.lock()
            void actions.vote(true)
          }}
        >
          👍 <span>Za</span>
        </button>
        <button
          className={`vote-big no${mine === false ? ' on' : ''}`}
          onClick={() => {
            sound.lock()
            void actions.vote(false)
          }}
        >
          👎 <span>Protiv</span>
        </button>
      </div>
      {typeof mine === 'boolean' && <p className="muted center">Možeš da promeniš glas dok ostali ne glasaju.</p>}
      <div className="card center">
        <DoneRow pub={pub} done={m.votes ?? {}} label="Glasalo" />
      </div>
      <RoleCard pub={pub} me={me} ticket={ticket} />
    </section>
  )
}

function Mission({ pub, me, actions, ticket }: ScreenProps) {
  const m = misijaOf(pub)
  const team = teamOf(m.team)
  const onTeam = team.includes(me)
  const [sent, setSent] = useState(false)
  const played = m.played?.[me] || sent
  const [note, setNote] = useState('')
  const need = failsNeeded(playerOrder(pub).length, missionNo(pub))
  useYourTurn(onTeam, pub.round)

  return (
    <section className="screen">
      <Track pub={pub} />
      <div className="card center">
        <small className="label">TIM NA MISIJI</small>
        <TeamRow pub={pub} team={m.team} />
        {need > 1 && <small className="warn">Za pad ove misije trebaju 2 sabotaže.</small>}
      </div>
      {onTeam && !played ? (
        <>
          <h1 className="title">Tvoja tajna karta 🤫</h1>
          <Hint pub={pub}>Sakrij ekran! Ekipa uvek igra Uspeh. Špijun bira: Uspeh da ostane sakriven ili Sabotažu.</Hint>
          <div className="yes-no">
            <button
              className="vote-big yes"
              onClick={() => {
                sound.lock()
                setSent(true)
                void actions.play(true)
              }}
            >
              ✅ <span>Uspeh</span>
            </button>
            <button
              className="vote-big no"
              onClick={() => {
                if (sideOf(ticket?.role) !== 'spijuni') {
                  setNote('Ti si u ekipi, ekipa uvek igra Uspeh.')
                  return
                }
                sound.lock()
                setSent(true)
                void actions.play(false)
              }}
            >
              💣 <span>Sabotaža</span>
            </button>
          </div>
          {note && <p className="error center">{note}</p>}
        </>
      ) : (
        <div className="card center">
          <Waiting>{onTeam ? 'Karta odigrana. Čekamo ostale iz tima' : 'Tim igra tajne karte'}</Waiting>
          <DoneRow pub={pub} done={m.played ?? {}} label="Odigralo" among={team} />
        </div>
      )}
      <RoleCard pub={pub} me={me} ticket={ticket} />
    </section>
  )
}

/** Drum roll on the host phone, then the mission's cards, shuffled. */
function Reveal({ pub, isHost, actions }: ScreenProps) {
  const m = misijaOf(pub)
  const result = m.results?.[mKey(missionNo(pub))]
  const [shown, setShown] = useState(false)
  const played = useRef(false)
  // Keyed on the result's arrival, not the object: every room update brings a new copy of it,
  // and re-running would cancel the timer.
  const ok = result ? result.ok : null
  // The ref only keeps the sounds from playing twice; the timer is re-armed whenever the effect re-runs.
  useEffect(() => {
    if (ok === null) return
    const first = !played.current
    played.current = true
    if (isHost && first) sound.drumRoll()
    const t = setTimeout(() => {
      setShown(true)
      if (isHost && first) (ok ? sound.cheer : sound.scratch)()
    }, 2400)
    return () => clearTimeout(t)
  }, [ok, isHost])

  if (!result || !shown)
    return (
      <section className="screen">
        <Track pub={pub} />
        <div className="drumroll">
          <div className="spotlight" />
          <h1 className="title chrome">Misija je…</h1>
          <div className="drum">🥁</div>
        </div>
      </section>
    )

  const size = teamOf(result.team).length
  const cards = Array.from({ length: size }, (_, i) => i >= size - result.fails)
  const w = wins(pub)
  const end = w.ekipa >= TO_WIN || w.spijuni >= TO_WIN

  return (
    <section className="screen">
      <Track pub={pub} />
      <h1 className={`title verdict ${result.ok ? 'ok' : 'bad'}`}>{result.ok ? 'USPELA! 🎉' : 'SABOTIRANA! 💣'}</h1>
      <div className="mission-cards">
        {cards.map((bad, i) => (
          <div key={i} className={`mission-card ${bad ? 'bad' : 'ok'}`} style={{ animationDelay: `${i * 0.25}s` }}>
            {bad ? '💣' : '✅'}
          </div>
        ))}
      </div>
      <p className="center muted">
        {result.fails === 0
          ? 'Nijedna sabotaža.'
          : result.fails === 1
            ? 'Jedna sabotaža.'
            : `${result.fails} sabotaže.`}
        {result.ok && result.fails > 0 && ' Ali trebale su 2, pa misija ipak uspeva!'}
      </p>
      <div className="card">
        <h2>Tim</h2>
        <TeamRow pub={pub} team={result.team} />
      </div>
      {isHost ? (
        <Button onClick={actions.next}>{end ? 'Kraj igre 👑' : 'Sledeća misija 🚀'}</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} nastavi</Waiting>
      )}
    </section>
  )
}

/** The crew won three missions; the spies get one shot at naming the Vidovnjak. */
function Guess({ pub, me, actions, ticket, secret }: ScreenProps) {
  const [pick, setPick] = useState('')
  const roles = secret?.roles ?? {}
  const spies = playerOrder(pub).filter((uid) => sideOf(roles[uid]) === 'spijuni')
  const others = playerOrder(pub).filter((uid) => !spies.includes(uid))
  const amSpy = sideOf(ticket?.role) === 'spijuni'
  useYourTurn(amSpy, 'guess')

  return (
    <section className="screen">
      <Track pub={pub} />
      <h1 className="title">Ekipa ima 3 misije! Ali…</h1>
      <div className="card center">
        <small className="label">ŠPIJUNI SE OTKRIVAJU</small>
        <div className="team-row">
          {spies.map((uid) => (
            <PlayerTag key={uid} player={pub.players?.[uid]} />
          ))}
        </div>
        <p className="muted">Ako pogode ko je Vidovnjak, špijuni kradu pobedu. Dogovorite se naglas!</p>
      </div>
      {!secret ? (
        <Waiting>Učitavanje</Waiting>
      ) : amSpy ? (
        <>
          <div className="card">
            <h2>Ko je Vidovnjak?</h2>
            <Players pub={pub} uids={others} picked={pick ? { [pick]: true } : {}} onPick={setPick} />
          </div>
          <Button variant="pink" disabled={!pick} onClick={() => actions.shoot(pick)}>
            {pick ? `To je ${nameOf(pub, pick)}! 🎯` : 'Izaberi jednog'}
          </Button>
          <p className="muted center">
            <small>Bilo koji špijun može da potvrdi, zato se prvo dogovorite.</small>
          </p>
        </>
      ) : (
        <Waiting>Špijuni traže Vidovnjaka. Ne odaji ništa! 🤐</Waiting>
      )}
      <RoleCard pub={pub} me={me} ticket={ticket} />
    </section>
  )
}

function Over({ pub, me, isHost, actions, secret }: ScreenProps) {
  const m = misijaOf(pub)
  const winner = m.winner ?? 'ekipa'
  const roles = secret?.roles ?? {}
  const order = playerOrder(pub)
  const winners = order.filter((uid) => sideOf(roles[uid]) === winner)
  const played = useRef(false)
  useEffect(() => {
    if (isHost && !played.current) {
      played.current = true
      sound.fanfare()
    }
  }, [isHost])
  const shotRight = m.shot && roles[m.shot] === 'menadzer'

  return (
    <section className="screen">
      <div className="winner">
        <div className="crown">{winner === 'ekipa' ? '🦸' : '🦹'}</div>
        <div className="winner-name">
          <span className="chrome">{winner === 'ekipa' ? 'EKIPA POBEĐUJE!' : 'ŠPIJUNI POBEĐUJU!'}</span>
        </div>
        {m.shot && (
          <p>
            Špijuni su gađali: {nameOf(pub, m.shot)}. {shotRight ? 'Pogodak, to je Vidovnjak! 🎯' : 'Promašaj! 😅'}
          </p>
        )}
        {roles[me] && (
          <p>{sideOf(roles[me]) === winner ? 'Pobedio si! 🎉' : 'Ovog puta ne. Revanš?'}</p>
        )}
      </div>
      <div className="card">
        <h2>Uloge</h2>
        {!secret ? (
          <Waiting>Učitavanje</Waiting>
        ) : (
          <ul className="gains">
            {[...winners, ...order.filter((u) => !winners.includes(u))].map((uid) => {
              const r = roles[uid] ? ROLES[roles[uid]] : null
              return (
                <li key={uid}>
                  <PlayerTag player={pub.players?.[uid]} you={uid === me} />
                  <span className={`reasons side-${r?.side}`}>
                    {r ? `${r.icon} ${r.name}` : '?'}
                    {winners.includes(uid) && ' 🏆'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="card center">
        <small className="label">REZULTAT SOBE</small>
        <div className="tally">
          Ekipa <b>{m.tally?.ekipa ?? 0}</b> : <b>{m.tally?.spijuni ?? 0}</b> Špijuni
        </div>
      </div>
      {isHost ? (
        <Button onClick={actions.newGame}>Nova igra</Button>
      ) : (
        <Waiting>Čekamo da {nameOf(pub, pub.hostUid)} pokrene novu igru</Waiting>
      )}
    </section>
  )
}

export function MisijaRules() {
  return (
    <div className="rules">
      <p>
        <b>Cilj:</b> ekipa želi 3 uspešne misije, špijuni 3 sabotirane. Pobeđuje cela strana.
      </p>
      <ol>
        <li>Svako dobija tajnu ulogu (drži kartu da je vidiš). Špijuni znaju jedni druge, ekipa ne zna ništa.</li>
        <li>Vođa (menja se posle svakog predloga) bira tim za misiju. Pričajte, ubeđujte, sumnjajte!</li>
        <li>Svi glasaju za ili protiv tima. Treba više od pola „za”, inače sledeći vođa predlaže.</li>
        <li>Peti predlog za istu misiju ide bez glasanja.</li>
        <li>Tim tajno igra kartu: ekipa uvek Uspeh, špijun može Sabotažu. Jedna sabotaža obara misiju.</li>
        <li>Sa 7 i više igrača, 4. misiju obaraju tek 2 sabotaže.</li>
      </ol>
      <h3>Specijalne uloge</h3>
      <p className="muted">Domaćin bira koliko ih ima (0 do 5). Uvek dolaze ovim redom:</p>
      <ul className="points">
        {SPECIAL_ORDER.map((r) => (
          <li key={r}>
            {ROLES[r].icon} <b>{ROLES[r].name}</b> ({SIDE_NAME[ROLES[r].side]}): {ROLES[r].text}
          </li>
        ))}
      </ul>
      <p className="muted">
        Kad je Vidovnjak u igri i ekipa pobedi, špijuni se otkrivaju i jednom pogađaju ko je Vidovnjak. Pogodak im
        donosi pobedu.
      </p>
    </div>
  )
}
