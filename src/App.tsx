import { Component, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { connect, isLocalBackend, type Backend } from './backend'
import { createRoom, joinRoom, roomExists, useRoom, type JoinError } from './game/room'
import { badgesFor, type GameId } from './game/types'
import { Blef } from './screens/Blef'
import { Game } from './screens/Game'
import { Kviz } from './screens/Kviz'
import { Lic } from './screens/Lic'
import { Misija, MisijaRules } from './screens/Misija'
import { Wave } from './screens/Wave'
import { badgeMark, BlefRules, Button, KvizRules, LicRules, Modal, Rules, Waiting, WaveRules } from './ui/components'
import * as sound from './ui/sound'
import { useStageSounds } from './ui/stageSounds'
import { BUILD_ID, useUpdateAvailable } from './ui/update'
import { keepAwake } from './ui/wakeLock'

const ROOM_KEY = 'uljez-room'
const NAME_KEY = 'uljez-name'
const GAME_KEY = 'druzina-game'

const GAMES: { id: GameId; name: string; icon: string; tagline: string; players: string }[] = [
  { id: 'uljez', name: 'ULJEZ', icon: '🕵️', tagline: 'Svi znaju tajnu reč. Osim uljeza.', players: '3 do 12 igrača' },
  { id: 'blef', name: 'BLEF', icon: '🤥', tagline: 'Izmisli laž, pronađi istinu.', players: '3 do 5, najbolje 3 ili 4' },
  { id: 'talas', name: 'TALAS', icon: '📡', tagline: 'Talasna dužina: pogodi šta je drugar mislio.', players: '3 do 5 igrača' },
  { id: 'kviz', name: 'KVIZ', icon: '⏱️', tagline: 'Isto pitanje, isti sat, 4 odgovora. Brzo!', players: '3 do 5 igrača' },
  { id: 'licitacija', name: 'LICITACIJA', icon: '🎟️', tagline: 'Ti protiv drugara. Tajna ponuda, ko da više?', players: 'tačno 2 igrača' },
  { id: 'misija', name: 'MISIJA', icon: '🦹', tagline: 'Velika ekipa, skriveni špijuni. Kome veruješ?', players: '5 do 12, najbolje 8+' },
]
const GAME_IDS = GAMES.map((g) => g.id) as string[]
const gameName = (id: GameId) => GAMES.find((g) => g.id === id)?.name ?? 'ULJEZ'

function saved(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function roomFromUrl(): string {
  const p = new URLSearchParams(location.search)
  return (p.get('soba') ?? '').toUpperCase().slice(0, 4)
}

export default function App() {
  const [be, setBe] = useState<Backend | null>(null)
  const [error, setError] = useState('')
  const [code, setCode] = useState<string>(() => roomFromUrl() || saved(ROOM_KEY))
  const [rules, setRules] = useState(false)
  const [muted, setMuted] = useState(sound.isMuted())
  const [musicOff, setMusicOff] = useState(sound.isMusicOff())
  // The game shown in the header and rules: the room's once inside one, else the one picked on the home screen.
  const [picked, setPicked] = useState<GameId>(() => (GAME_IDS.includes(saved(GAME_KEY)) ? (saved(GAME_KEY) as GameId) : 'uljez'))
  const [roomGame, setRoomGame] = useState<GameId | null>(null)
  const game = (code && roomGame) || picked
  const update = useUpdateAvailable()

  useEffect(() => {
    connect()
      .then(setBe)
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  useEffect(() => {
    const onTouch = () => {
      sound.unlock()
      void keepAwake()
    }
    window.addEventListener('pointerdown', onTouch)
    return () => window.removeEventListener('pointerdown', onTouch)
  }, [])

  const enter = (c: string) => {
    save(ROOM_KEY, c)
    setCode(c)
    const url = new URL(location.href)
    url.searchParams.delete('soba')
    history.replaceState(null, '', url)
  }
  const leave = () => {
    save(ROOM_KEY, null)
    setCode('')
    setRoomGame(null)
  }

  return (
    <div className="app">
      <div className="bg" aria-hidden>
        <div className="halftone" />
        <div className="rays" />
      </div>
      <header className="top">
        <span className="logo chrome">{gameName(game)}</span>
        {code && <span className="code-chip">{code}</span>}
        <span className="spacer" />
        {!muted && (
          <button
            className={`icon-btn${musicOff ? ' off' : ''}`}
            aria-label={musicOff ? 'Uključi muziku' : 'Isključi muziku'}
            onClick={() => {
              sound.setMusicOff(!musicOff)
              setMusicOff(!musicOff)
            }}
          >
            🎵
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={muted ? 'Uključi zvuk' : 'Isključi zvuk'}
          onClick={() => {
            sound.setMuted(!muted)
            setMuted(!muted)
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" onClick={() => setRules(true)} aria-label="Pravila">
          ?
        </button>
        {code && (
          <button className="icon-btn" onClick={leave} aria-label="Izađi iz sobe">
            ⏏
          </button>
        )}
      </header>

      {update && <UpdateBanner inRoom={!!code} />}

      <main>
        <Crashed>
        {error ? (
          <div className="card center">
            <h2>Nema veze sa serverom</h2>
            <p className="muted">{error}</p>
            <Button onClick={() => location.reload()}>Probaj ponovo</Button>
          </div>
        ) : !be ? (
          <Waiting>Povezivanje</Waiting>
        ) : code ? (
          <Room be={be} code={code} onLeave={leave} onGame={setRoomGame} />
        ) : (
          <Home
            be={be}
            game={picked}
            onPick={(g) => {
              save(GAME_KEY, g)
              setPicked(g)
            }}
            onEnter={enter}
          />
        )}
        </Crashed>
      </main>

      {isLocalBackend() && <div className="local-note">Probni režim (bez interneta)</div>}
      {rules && (
        <Modal title="Kako se igra" onClose={() => setRules(false)}>
          {game === 'blef' ? <BlefRules /> : game === 'talas' ? <WaveRules /> : game === 'kviz' ? <KvizRules /> : game === 'licitacija' ? <LicRules /> : game === 'misija' ? <MisijaRules /> : <Rules />}
        </Modal>
      )}
    </div>
  )
}

/** A new version is live. Never reloads on its own: mid-game it only asks to refresh after the round. */
function UpdateBanner({ inRoom }: { inRoom: boolean }) {
  return (
    <div className="update-banner" role="status">
      {!inRoom && (
        <span className="update-pow" aria-hidden>
          NOVO!
        </span>
      )}
      <p>
        <b>Stigla je nova verzija.</b> {inRoom ? 'Osveži posle partije, ostaješ u sobi.' : 'Osveži da je dobiješ.'}
      </p>
      <Button small variant={inRoom ? 'ghost' : 'primary'} onClick={() => location.reload()}>
        {inRoom ? 'Osveži sad' : 'Osveži'}
      </Button>
    </div>
  )
}

/** If a screen crashes, show a reload button instead of a black page. The room is remembered, so reloading rejoins it. */
class Crashed extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(e: unknown) {
    return { error: String((e as Error)?.message ?? e) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card center">
        <h2>Ups, nešto je puklo</h2>
        <p className="muted">Osveži stranicu, vraćaš se u istu sobu.</p>
        <Button onClick={() => location.reload()}>Osveži</Button>
        <p className="muted">
          <small>{this.state.error}</small>
        </p>
      </div>
    )
  }
}

function Home({
  be,
  game,
  onPick,
  onEnter,
}: {
  be: Backend
  game: GameId
  onPick: (game: GameId) => void
  onEnter: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const current = GAMES.find((g) => g.id === game) ?? GAMES[0]

  return (
    <section className="screen home">
      <div className="hero">
        <div className="hero-sub">DRUŽINA · IGRE ZA EKIPU</div>
        <h1 className={`hero-title chrome${current.name.length > 6 ? ' long' : ''}`}>{current.name}</h1>
        <p className="muted">{current.tagline}</p>
      </div>
      <div className="game-picker" role="radiogroup" aria-label="Izaberi igru">
        {GAMES.map((g) => (
          <button
            key={g.id}
            role="radio"
            aria-checked={g.id === game}
            className={`game-card${g.id === game ? ' on' : ''}`}
            onClick={() => onPick(g.id)}
          >
            <span className="game-icon">{g.icon}</span>
            <b>{g.name}</b>
            <small>{g.players}</small>
          </button>
        ))}
      </div>
      <Button
        onClick={async () => {
          try {
            onEnter(await createRoom(be, game))
          } catch (e) {
            setError(String((e as Error).message))
          }
        }}
      >
        Napravi sobu
      </Button>
      <div className="card">
        <h2>Imaš kod sobe?</h2>
        <div className="join-row">
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
            placeholder="ABCD"
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
          />
          <Button
            variant="ghost"
            disabled={code.length !== 4}
            onClick={async () => {
              if (await roomExists(be, code)) onEnter(code)
              else setError(`Soba ${code} ne postoji.`)
            }}
          >
            Uđi
          </Button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <p className="version-note">verzija {BUILD_ID}</p>
    </section>
  )
}

const JOIN_ERRORS: Record<JoinError, string> = {
  'no-room': 'Ta soba više ne postoji.',
  'badge-taken': 'Neko je upravo uzeo tog heroja, izaberi drugog.',
  full: 'Soba je puna.',
  started: 'Igra je već počela bez tebe. Neka domaćin pokrene novu igru.',
}

function Room({
  be,
  code,
  onLeave,
  onGame,
}: {
  be: Backend
  code: string
  onLeave: () => void
  onGame: (game: GameId) => void
}) {
  const view = useRoom(be, code)
  const game = view.pub?.game ?? 'uljez'
  useStageSounds(view.pub?.players?.[be.uid] ? view.pub : null, be.uid)
  useEffect(() => onGame(game), [game, onGame])
  if (view.loading) return <Waiting>Učitavanje sobe</Waiting>
  if (!view.pub)
    return (
      <div className="card center">
        <h2>Soba {code} ne postoji</h2>
        <Button onClick={onLeave}>Nazad</Button>
      </div>
    )
  if (!view.pub.players?.[be.uid]) return <Join be={be} code={code} view={view} onLeave={onLeave} />
  if (game === 'blef') return <Blef be={be} code={code} view={view} />
  if (game === 'talas') return <Wave be={be} code={code} view={view} />
  if (game === 'kviz') return <Kviz be={be} code={code} view={view} />
  if (game === 'licitacija') return <Lic be={be} code={code} view={view} />
  if (game === 'misija') return <Misija be={be} code={code} view={view} />
  return <Game be={be} code={code} view={view} />
}

function Join({ be, code, view, onLeave }: { be: Backend; code: string; view: ReturnType<typeof useRoom>; onLeave: () => void }) {
  const [name, setName] = useState(saved(NAME_KEY))
  const [badge, setBadge] = useState('')
  const [error, setError] = useState('')
  const taken = new Set(Object.values(view.pub?.players ?? {}).map((p) => p.badge))

  return (
    <section className="screen">
      <h1 className="title">Javi se u bazu 🦸</h1>
      <div className="card">
        <h2>Tvoje ime</h2>
        <input
          className="name-input"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="npr. Marko"
          autoComplete="off"
        />
      </div>
      <div className="card">
        <h2>Ko si u družini?</h2>
        <div className="badge-grid">
          {badgesFor(view.pub?.game).map((b) => (
            <button
              key={b.id}
              className={`badge-pick${badge === b.id ? ' on' : ''}`}
              style={{ '--c': b.color } as CSSProperties}
              disabled={taken.has(b.id)}
              onClick={() => setBadge(b.id)}
            >
              <span className="badge badge-md" style={{ '--c': b.color } as CSSProperties}>
                {badgeMark(b)}
              </span>
              <span>{b.name}</span>
              {taken.has(b.id) && <small>zauzet</small>}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <Button
        disabled={!name.trim() || !badge || taken.has(badge)}
        onClick={async () => {
          save(NAME_KEY, name.trim())
          const err = await joinRoom(be, code, name, badge)
          if (err) setError(JOIN_ERRORS[err])
        }}
      >
        Uđi u sobu {code}
      </Button>
      <button className="link-btn" onClick={onLeave}>
        Nazad
      </button>
    </section>
  )
}
