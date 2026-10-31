import { useEffect, useRef, useState } from 'react'
import type { Backend } from '../backend'
import { makeRoomCode, normalizeSecret } from './util'
import { gameDefinition } from '../games'
import { type GameId, type Pub, type Secret, type Ticket } from './types'
import { ROOM_PROTOCOL, roomCompatible } from './compatibility'

// 'missions' is from the previous version, kept so a room an old phone moved there can recover.
const SECRET_PHASES: string[] = ['reveal', 'guess', 'missions', 'score', 'over']

export const roomPath = (code: string) => `rooms/${code}`

/** Last time anyone created, joined or opened each room; what decides when a room is old enough to delete. */
export const ROOM_INDEX_PATH = 'roomIndex'
export const ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000
const CLEANUP_BATCH = 20
const CLEANUP_TIME_LIMIT_MS = 3000

/** Records that the room was just used. Best effort: a failure only means the room may expire sooner. */
export async function touchRoom(be: Backend, code: string): Promise<void> {
  try {
    await be.set(`${ROOM_INDEX_PATH}/${code}`, be.serverNow())
  } catch {
    // Rules not published yet, or offline.
  }
}

/**
 * Deletes a room and its index entry in one write. Leaves nothing behind for a late presence
 * write to recreate, since the rules refuse writes to a room without `pub`.
 */
export async function deleteRoom(be: Backend, code: string): Promise<void> {
  await be.update('', { [roomPath(code)]: null, [`${ROOM_INDEX_PATH}/${code}`]: null })
}

/** Like deleteRoom but for the leave button: never throws, since leaving must always work. */
export async function closeRoom(be: Backend, code: string): Promise<void> {
  try {
    await deleteRoom(be, code)
  } catch {
    // The 24 hour cleanup will get it.
  }
}

/**
 * Deletes rooms nobody has used for 24 hours, a few at a time, skipping any room a phone is still
 * connected to. Runs before a new room is made; slow or failing cleanup never blocks that.
 */
export async function cleanupOldRooms(be: Backend): Promise<number> {
  let removed = 0
  const run = async () => {
    const codes = await be.keysAtOrBelow(ROOM_INDEX_PATH, be.serverNow() - ROOM_MAX_AGE_MS, CLEANUP_BATCH)
    for (const code of codes) {
      const online = (await be.get(`${roomPath(code)}/online`)) as Record<string, true | number> | null
      if (online && Object.values(online).some((v) => v === true)) continue
      await deleteRoom(be, code)
      removed++
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([run(), new Promise((resolve) => (timer = setTimeout(resolve, CLEANUP_TIME_LIMIT_MS)))])
  } catch {
    // Best effort.
  } finally {
    clearTimeout(timer)
  }
  return removed
}

export async function createRoom(be: Backend, game: GameId = 'uljez'): Promise<string> {
  await cleanupOldRooms(be)
  for (let i = 0; i < 20; i++) {
    const code = makeRoomCode(Math.random)
    const pub: Pub = { hostUid: be.uid, game, protocol: ROOM_PROTOCOL, createdAt: Date.now(), mode: 'normal', phase: 'lobby', round: 0 }
    // One atomic step, so two phones picking the same code cannot both get it.
    const created = await be.transaction<Pub>(`${roomPath(code)}/pub`, (cur) => (cur ? undefined : pub))
    if (!created) continue
    await touchRoom(be, code)
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
  /** The room was there and has since been deleted (host left or it expired). */
  gone?: boolean
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
  const [goneCode, setGoneCode] = useState('')
  // The latest pub, readable from cleanup functions that must not use stale state.
  const pubRef = useRef<Pub | null>(null)
  const seenRef = useRef('')

  useEffect(() => be.connection?.(setConnected), [be])

  useEffect(() => {
    setLoading(true)
    setError('')
    pubRef.current = null
    seenRef.current = ''
    setGoneCode('')
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
        pubRef.current = v as Pub | null
        if (v) seenRef.current = code
        else if (seenRef.current === code) setGoneCode(code)
        setPub(v as Pub | null)
        setLoadedCode(code)
        setLoading(false)
      }, failed),
      be.listen(`${roomPath(code)}/online`, (v) => setOnline((v as Record<string, true | number>) ?? {}), failed),
    ]
    return () => stops.forEach((s) => s())
  }, [be, code, attempt])

  // Only while the room exists, so a deleted room is never recreated by a late presence write.
  const present = !!pub && loadedCode === code
  useEffect(() => {
    if (!present) return
    const stopPresence = be.presence(`${roomPath(code)}/online/${be.uid}`)
    return () => stopPresence?.(pubRef.current !== null)
  }, [be, code, present, attempt])

  // Opening a room keeps it from expiring.
  const member = present && !!pub?.players?.[be.uid]
  useEffect(() => {
    if (member) void touchRoom(be, code)
  }, [be, code, member])

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
    gone: goneCode === code,
    retry: () => setAttempt((n) => n + 1) }
}
