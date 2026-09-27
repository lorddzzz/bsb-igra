import { useEffect, useMemo, useState } from 'react'
import type { Backend } from '../backend'
import {
  allMissionsDone,
  allVoted,
  applyRound,
  isCaught,
  makeRoomCode,
  nextRound,
  pickerFor,
  playerOrder,
  resetToLobby,
  scoreRound,
  setupRound,
} from './logic'
import { MAX_PLAYERS, type Mode, type Phase, type Pub, type Secret, type Ticket } from './types'

const SECRET_PHASES: Phase[] = ['reveal', 'guess', 'missions', 'score', 'over']

export const roomPath = (code: string) => `rooms/${code}`

export async function createRoom(be: Backend): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = makeRoomCode(Math.random)
    const taken = await be.get(`${roomPath(code)}/pub/hostUid`)
    if (taken) continue
    const pub: Pub = { hostUid: be.uid, createdAt: Date.now(), mode: 'normal', phase: 'lobby', round: 0 }
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
  const ok = await be.transaction<Pub>(`${roomPath(code)}/pub`, (pub) => {
    error = null
    if (!pub) return pub
    const players = { ...(pub.players ?? {}) }
    const me = players[be.uid]
    if (!me && pub.phase !== 'lobby') {
      error = 'started'
      return undefined
    }
    if (!me && Object.keys(players).length >= MAX_PLAYERS) {
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
        (v) => setSecret(v as Secret | null),
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
      toVoting: () => pub && step('clues', pub.round, (p) => ({ ...p, phase: 'voting' })),
      vote: (target: string) => pub?.phase === 'voting' && be.set(`${pubPath}/votes/${be.uid}`, target),
      closeVoting: () => pub && step('voting', pub.round, (p) => ({ ...p, phase: 'reveal' })),
      afterReveal: () =>
        pub &&
        secret &&
        step('reveal', pub.round, (p) => ({ ...p, phase: isCaught(p, secret.impostor) ? 'guess' : 'missions' })),
      guess: (word: string) => pub && step('guess', pub.round, (p) => ({ ...p, guess: word, phase: 'missions' })),
      missionVote: (target: string, up: boolean) =>
        be.set(`${pubPath}/missionVotes/${be.uid}/${target}`, up),
      missionDone: () => be.set(`${pubPath}/missionDone/${be.uid}`, true),
      finishRound: () =>
        pub &&
        secret &&
        secret.round === pub.round &&
        step('missions', pub.round, (p) => applyRound(p, scoreRound(p, secret))),
      nextRound: () => pub && step('score', pub.round, (p) => nextRound(p)),
      newGame: () => pub && step('over', pub.round, (p) => resetToLobby(p)),
    }
  }, [be, code, pub, secret, pubPath])

  // Move on automatically once everyone has voted / judged the missions. Any phone may do it.
  useEffect(() => {
    if (pub?.phase === 'voting' && allVoted(pub)) void actions.closeVoting()
  }, [pub, actions])
  useEffect(() => {
    if (pub?.phase === 'missions' && secret && allMissionsDone(pub)) void actions.finishRound()
  }, [pub, secret, actions])

  return actions
}

export type Actions = ReturnType<typeof useActions>
