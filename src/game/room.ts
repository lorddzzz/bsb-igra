import { useEffect, useMemo, useState } from 'react'
import type { Backend } from '../backend'
import {
  allGuessed,
  votesOf,
  normalizeSecret,
  allVoted,
  applyRound,
  caughtImpostors,
  makeRoomCode,
  nextRound,
  newGameSeed,
  pickerFor,
  playerOrder,
  resetToLobby,
  scoreRound,
  setupRound,
} from './logic'
import { LIC_PLAYERS } from '../lic/logic'
import { badgesFor, MAX_VOTES, type GameId, type Mode, type Phase, type Pub, type Secret, type Ticket } from './types'

// 'missions' is from the previous version, kept so a room an old phone moved there can recover.
const SECRET_PHASES: string[] = ['reveal', 'guess', 'missions', 'score', 'over']

export const roomPath = (code: string) => `rooms/${code}`

export async function createRoom(be: Backend, game: GameId = 'uljez'): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = makeRoomCode(Math.random)
    const taken = await be.get(`${roomPath(code)}/pub/hostUid`)
    if (taken) continue
    const pub: Pub = { hostUid: be.uid, game, createdAt: Date.now(), mode: 'normal', phase: 'lobby', round: 0 }
    await be.set(`${roomPath(code)}/pub`, pub)
    return code
  }
  throw new Error('Nije uspelo pravljenje sobe, probaj ponovo.')
}

export async function roomExists(be: Backend, code: string): Promise<boolean> {
  return Boolean(await be.get(`${roomPath(code)}/pub/hostUid`))
}

export type JoinError = 'no-room' | 'badge-taken' | 'full' | 'started'

export async function joinRoom(be: Backend, code: string, name: string, badge: string): Promise<JoinError | null> {
  let error: JoinError | null = null
  // Firebase may first try a transaction against an empty cache; only the last try counts.
  let found = false
  const ok = await be.transaction<Pub>(`${roomPath(code)}/pub`, (pub) => {
    error = null
    found = Boolean(pub)
    if (!pub) return pub
    const players = { ...(pub.players ?? {}) }
    const me = players[be.uid]
    if (!me && pub.phase !== 'lobby') {
      error = 'started'
      return undefined
    }
    const max = pub.game === 'licitacija' ? LIC_PLAYERS : badgesFor(pub.game).length
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
}

export function useRoom(be: Backend, code: string): RoomView {
  const [pub, setPub] = useState<Pub | null>(null)
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [secret, setSecret] = useState<Secret | null>(null)
  const [online, setOnline] = useState<Record<string, true | number>>({})

  useEffect(() => {
    setLoading(true)
    const stops = [
      be.listen(`${roomPath(code)}/pub`, (v) => {
        setPub(v as Pub | null)
        setLoading(false)
      }),
      be.listen(`${roomPath(code)}/tickets/${be.uid}`, (v) => setTicket(v as Ticket | null)),
      be.listen(`${roomPath(code)}/online`, (v) => setOnline((v as Record<string, true | number>) ?? {})),
    ]
    be.presence(`${roomPath(code)}/online/${be.uid}`)
    return () => stops.forEach((s) => s())
  }, [be, code])

  // The round's answers are only readable once voting is over (enforced by database rules).
  const secretOpen = pub ? SECRET_PHASES.includes(pub.phase) : false
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
        },
      )
    }
    start(0)
    return () => {
      clearTimeout(retry)
      stop()
    }
  }, [be, code, secretOpen, round])

  return { pub, ticket, secret, online, loading }
}

/** Every action a player can take. Phase changes go through transactions, so double taps are harmless. */
export function useActions(be: Backend, code: string, view: RoomView) {
  const { pub, secret } = view
  const roundSecret = secret && pub && secret.round === pub.round ? secret : null
  const isHost = pub?.hostUid === be.uid
  const pubPath = `${roomPath(code)}/pub`

  const actions = useMemo(() => {
    const step = (from: Phase, round: number, fn: (p: Pub) => Pub | undefined) =>
      be.transaction<Pub>(pubPath, (p) => {
        if (!p) return p
        if (p.phase !== from || p.round !== round) return undefined
        return fn(p)
      })

    return {
      setMode: (mode: Mode) => be.set(`${pubPath}/mode`, mode),
      kick: (uid: string) => be.set(`${pubPath}/players/${uid}`, null),
      startGame: () =>
        pub &&
        step('lobby', pub.round, (p) => ({
          ...resetToLobby(p),
          phase: 'category',
          round: 1,
          seed: newGameSeed(Math.random),
          pickerOffset: Math.floor(Math.random() * playerOrder(p).length),
          scores: Object.fromEntries(playerOrder(p).map((uid) => [uid, 0])),
        })),
      pickCategory: async (categoryId: string) => {
        if (!pub || pub.phase !== 'category' || pickerFor(pub) !== be.uid) return
        const setup = setupRound(pub, categoryId, Math.random)
        const patch: Record<string, unknown> = { secret: setup.secret }
        for (const [uid, t] of Object.entries(setup.tickets)) patch[`tickets/${uid}`] = t
        await be.update(roomPath(code), patch)
        await step('category', pub.round, (p) => ({ ...p, phase: 'clues', category: categoryId, starter: setup.starter }))
      },
      toVoting: () => isHost && pub && step('clues', pub.round, (p) => ({ ...p, phase: 'voting' })),
      /** Adds or removes a suspect; at most MAX_VOTES, and not after confirming. */
      vote: (target: string) => {
        if (pub?.phase !== 'voting' || pub.locked?.[be.uid]) return
        const mine = votesOf(pub, be.uid)
        if (mine.includes(target)) {
          if (typeof pub.votes?.[be.uid] === 'string') return be.set(`${pubPath}/votes/${be.uid}`, null)
          return be.set(`${pubPath}/votes/${be.uid}/${target}`, null)
        }
        if (mine.length >= MAX_VOTES) return
        return be.set(`${pubPath}/votes/${be.uid}/${target}`, true)
      },
      lockVote: () =>
        pub?.phase === 'voting' && votesOf(pub, be.uid).length > 0 && be.set(`${pubPath}/locked/${be.uid}`, true),
      closeVoting: () => pub && step('voting', pub.round, (p) => ({ ...p, phase: 'reveal' })),
      afterReveal: () =>
        isHost &&
        pub &&
        roundSecret &&
        step('reveal', pub.round, (p) =>
          caughtImpostors(p, roundSecret).length ? { ...p, phase: 'guess' } : applyRound(p, scoreRound(p, roundSecret)),
        ),
      // The last caught impostor to guess also closes the round.
      guess: (word: string) =>
        pub &&
        roundSecret &&
        step('guess', pub.round, (p) => {
          const next = { ...p, guesses: { ...(p.guesses ?? {}), [be.uid]: word } }
          return allGuessed(next, roundSecret) ? applyRound(next, scoreRound(next, roundSecret)) : next
        }),
      finishGuessing: () =>
        pub && roundSecret && step('guess', pub.round, (p) => applyRound(p, scoreRound(p, roundSecret))),
      nextRound: () => isHost && pub && step('score', pub.round, (p) => nextRound(p)),
      newGame: () => isHost && pub && step('over', pub.round, (p) => resetToLobby(p)),
    }
  }, [be, code, pub, roundSecret, isHost, pubPath])

  // Move on automatically once everyone has voted / guessed. Any phone may do it.
  useEffect(() => {
    if (pub?.phase === 'voting' && allVoted(pub)) void actions.closeVoting()
  }, [pub, actions])
  useEffect(() => {
    if (pub?.phase === 'guess' && roundSecret && allGuessed(pub, roundSecret)) void actions.finishGuessing()
  }, [pub, roundSecret, actions])
  // A phone still on the old version may move the room into the removed missions screen; score the round instead.
  useEffect(() => {
    if ((pub?.phase as string) === 'missions' && roundSecret)
      void be.transaction<Pub>(`${roomPath(code)}/pub`, (p) =>
        p && (p.phase as string) === 'missions' && p.round === roundSecret.round
          ? applyRound(p, scoreRound(p, roundSecret))
          : undefined,
      )
  }, [be, code, pub, roundSecret])

  return actions
}

export type Actions = ReturnType<typeof useActions>
