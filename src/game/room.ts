import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import { makeRoomCode, normalizeSecret } from './util'
import { gameDefinition } from '../games'
import { type GameId, type Pub, type Secret, type Ticket } from './types'
import { ROOM_PROTOCOL, roomCompatible } from './compatibility'

// 'missions' is from the previous version, kept so a room an old phone moved there can recover.
const SECRET_PHASES: string[] = ['reveal', 'guess', 'missions', 'score', 'over']

export const roomPath = (code: string) => `rooms/${code}`

export async function createRoom(be: Backend, game: GameId = 'uljez'): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = makeRoomCode(Math.random)
    const taken = await be.get(`${roomPath(code)}/pub/hostUid`)
    if (taken) continue
    const pub: Pub = { hostUid: be.uid, game, protocol: ROOM_PROTOCOL, createdAt: Date.now(), mode: 'normal', phase: 'lobby', round: 0 }
    await be.set(`${roomPath(code)}/pub`, pub)
    return code
  }
  throw new Error('Nije uspelo pravljenje sobe, probaj ponovo.')
}

export async function roomExists(be: Backend, code: string): Promise<boolean> {
  return Boolean(await be.get(`${roomPath(code)}/pub/hostUid`))
}

export type JoinError = 'no-room' | 'badge-taken' | 'full' | 'started' | 'incompatible'

export async function joinRoom(be: Backend, code: string, name: string, badge: string): Promise<JoinError | null> {
  let error: JoinError | null = null
  // Firebase may first try a transaction against an empty cache; only the last try counts.
  let found = false
  const ok = await be.transaction<Pub>(`${roomPath(code)}/pub`, (pub) => {
    error = null
    found = Boolean(pub)
    if (!pub) return pub
    if (!roomCompatible(pub)) {
      error = 'incompatible'
      return undefined
    }
    const players = { ...(pub.players ?? {}) }
    const me = players[be.uid]
    if (!me && pub.phase !== 'lobby') {
      error = 'started'
      return undefined
    }
    const max = gameDefinition(pub.game)!.maxPlayers
    if (!me && Object.keys(players).length >= max) {
      error = 'full'
      return undefined
    }
    if (Object.entries(players).some(([uid, p]) => uid !== be.uid && p.badge === badge)) {
      error = 'badge-taken'
      return undefined
    }
    players[be.uid] = { name: name.trim().slice(0, 16), badge, joinedAt: me?.joinedAt ?? Date.now() }
    return { ...pub, players }
  })
  // Returning null for a room that isn't there commits nothing, but still counts as committed.
  if (ok && !found) return 'no-room'
  if (!ok && !error) return (await roomExists(be, code)) ? 'started' : 'no-room'
  return error
}

export interface RoomView {
  pub: Pub | null
  ticket: Ticket | null
  secret: Secret | null
  online: Record<string, true | number>
  loading: boolean
  connected?: boolean
  error?: string
  retry?: () => void
}

export function useRoom(be: Backend, code: string): RoomView {
  const [pub, setPub] = useState<Pub | null>(null)
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [secret, setSecret] = useState<Secret | null>(null)
  const [online, setOnline] = useState<Record<string, true | number>>({})
  const [connected, setConnected] = useState(!be.connection)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loadedCode, setLoadedCode] = useState('')

  useEffect(() => be.connection?.(setConnected), [be])

  useEffect(() => {
    setLoading(true)
    setError('')
    setPub(null)
    setTicket(null)
    setSecret(null)
    setOnline({})
    const failed = () => {
      setLoading(false)
      setError('Veza sa sobom nije uspela. Probaj ponovo.')
    }
    const stops = [
      be.listen(`${roomPath(code)}/pub`, (v) => {
        setPub(v as Pub | null)
        setLoadedCode(code)
        setLoading(false)
      }, failed),
      be.listen(`${roomPath(code)}/online`, (v) => setOnline((v as Record<string, true | number>) ?? {}), failed),
    ]
    const stopPresence = be.presence(`${roomPath(code)}/online/${be.uid}`)
    return () => {
      stops.forEach((s) => s())
      stopPresence?.()
    }
  }, [be, code, attempt])

  const compatible = !!pub && loadedCode === code && roomCompatible(pub)
  useEffect(() => {
    if (!compatible) return
    return be.listen(`${roomPath(code)}/tickets/${be.uid}`, (v) => setTicket(v as Ticket | null), () => {
      setError('Tvoja tajna kartica nije stigla. Probaj ponovo.')
    })
  }, [be, code, compatible, attempt])

  // The round's answers are only readable once voting is over (enforced by database rules).
  const secretOpen = compatible && pub ? SECRET_PHASES.includes(pub.phase) : false
  const round = pub?.round
  useEffect(() => {
    if (!secretOpen) {
      setSecret(null)
      return
    }
    let stop = () => {}
    let retry: ReturnType<typeof setTimeout> | undefined
    const start = (attempt: number) => {
      stop = be.listen(
        `${roomPath(code)}/secret`,
        (v) => setSecret(normalizeSecret(v)),
        () => {
          if (attempt < 5) retry = setTimeout(() => start(attempt + 1), 400 * (attempt + 1))
          else setError('Tajni podaci nisu stigli. Probaj ponovo.')
        },
      )
    }
    start(0)
    return () => {
      clearTimeout(retry)
      stop()
    }
  }, [be, code, secretOpen, round, attempt])

  return { pub: loadedCode === code ? pub : null, ticket, secret, online, loading, connected, error,
    retry: () => setAttempt((n) => n + 1) }
}
