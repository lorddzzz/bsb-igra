import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath, type RoomView } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  afterReveal,
  allPlayed,
  allVoted,
  applyMission,
  closeVote,
  leader,
  maxSpecials,
  misijaOf,
  missionNo,
  mKey,
  proposeTeam,
  resetMisijaLobby,
  shoot,
  startMisija,
  tallyMission,
  teamOf,
} from './logic'
import type { MisijaSecret, MisijaTicket } from './types'
import { playerOrder } from '../game/logic'

/** This game's secret (roles and mission cards), once the database lets this phone read it. */
export function misijaSecret(view: RoomView): MisijaSecret | null {
  const s = (view.secret as unknown as { misija?: MisijaSecret } | null)?.misija
  return s && s.game === misijaOf(view.pub!).game ? s : null
}

/** My private role card for this game, or null while it's on its way. */
export function misijaTicket(view: RoomView): MisijaTicket | null {
  const t = view.ticket as unknown as MisijaTicket | null
  return t && t.game && t.game === misijaOf(view.pub!).game ? t : null
}

/** Every Misija action. Phase changes go through transactions, so double taps are harmless. */
export function useMisijaActions(be: Backend, code: string, view: RoomView) {
  const pub = view.pub!
  const secret = misijaSecret(view)
  const isHost = pub.hostUid === be.uid
  const pubPath = `${roomPath(code)}/pub`

  const actions = useMemo(() => {
    const step = (from: Phase, round: number, fn: (p: Pub) => Pub | undefined) =>
      be.transaction<Pub>(pubPath, (p) => {
        if (!p) return p
        if (p.phase !== from || p.round !== round) return undefined
        return fn(p)
      })

    return {
      kick: (uid: string) => be.set(`${pubPath}/players/${uid}`, null),
      setSpecials: (n: number) =>
        isHost &&
        pub.phase === 'lobby' &&
        be.set(`${pubPath}/misija/specials`, Math.max(0, Math.min(n, maxSpecials(playerOrder(pub).length)))),
      start: async () => {
        if (!isHost || pub.phase !== 'lobby') return
        const s = startMisija(pub, Math.random)
        const patch: Record<string, unknown> = { 'secret/misija': s.secret }
        for (const [uid, t] of Object.entries(s.tickets)) patch[`tickets/${uid}`] = t
        await be.update(roomPath(code), patch)
        await step('lobby', pub.round, () => s.pub)
      },
      /** The leader's picks go to the database as they tap, so everyone can watch the team form. */
      toggle: (uid: string) => {
        if (pub.phase !== 'team' || leader(pub) !== be.uid) return
        return be.set(`${pubPath}/misija/team/${uid}`, misijaOf(pub).team?.[uid] ? null : true)
      },
      propose: () =>
        step('team', pub.round, (p) =>
          leader(p) === be.uid && misijaOf(p).turn === misijaOf(pub).turn ? proposeTeam(p, teamOf(misijaOf(p).team)) : undefined,
        ),
      vote: (yes: boolean) => pub.phase === 'vote' && be.set(`${pubPath}/misija/votes/${be.uid}`, yes),
      closeVote: () => step('vote', pub.round, (p) => (allVoted(p) ? closeVote(p) : undefined)),
      /** My mission card: the card itself is secret, only that I played is public. */
      play: async (success: boolean) => {
        const m = misijaOf(pub)
        if (pub.phase !== 'mission' || !m.team?.[be.uid]) return
        await be.set(`${roomPath(code)}/secret/misija/plays/${mKey(missionNo(pub))}/${be.uid}`, success)
        await be.set(`${pubPath}/misija/played/${be.uid}`, true)
      },
      toReveal: () => step('mission', pub.round, (p) => (allPlayed(p) ? { ...p, phase: 'reveal' } : undefined)),
      tally: () => {
        if (!secret) return
        return step('reveal', pub.round, (p) => {
          if (misijaOf(p).results?.[mKey(missionNo(p))]) return undefined
          const r = tallyMission(p, secret)
          return r ? applyMission(p, r) : undefined
        })
      },
      next: () =>
        isHost && step('reveal', pub.round, (p) => (misijaOf(p).results?.[mKey(missionNo(p))] ? afterReveal(p) : undefined)),
      shoot: (target: string) => secret?.roles && step('guess', pub.round, (p) => shoot(p, target, secret.roles!)),
      newGame: () => isHost && step('over', pub.round, (p) => resetMisijaLobby(p)),
    }
  }, [be, code, pub, secret, isHost, pubPath])

  // Any phone moves things on once everyone has voted / played, and scores the mission once the cards can be read.
  useEffect(() => {
    if (pub.phase === 'vote' && allVoted(pub)) void actions.closeVote()
    if (pub.phase === 'mission' && allPlayed(pub)) void actions.toReveal()
    if (pub.phase === 'reveal' && secret && !misijaOf(pub).results?.[mKey(missionNo(pub))]) void actions.tally()
  }, [pub, secret, actions])

  return actions
}

export type MisijaActions = ReturnType<typeof useMisijaActions>
