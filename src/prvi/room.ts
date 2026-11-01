import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import type { PrviLevel } from '../data/prviPrompts'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import { allVoted, applyPrvi, nextPrviRound, prviOf, resetPrviLobby, scorePrvi, startPrvi, validVote } from './logic'

const LEVELS: PrviLevel[] = ['lagano', 'srednje', 'ljuto']

/** Every "Ko bi prvi?" action. Phase changes go through transactions, so double taps are harmless. */
export function usePrviActions(be: Backend, code: string, pub: Pub) {
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
      setLevel: (level: PrviLevel) =>
        isHost && pub.phase === 'lobby' && LEVELS.includes(level) && be.set(`${pubPath}/prvi/level`, level),
      start: () => isHost && step('lobby', pub.round, (p) => startPrvi(p, Math.random)),
      // A confirmed vote is final: a second one from the same phone is ignored, judged on the database.
      vote: (target: string) => {
        if (pub.phase !== 'vote' || !validVote(pub, be.uid, target)) return
        return be.transaction<string>(`${pubPath}/prvi/votes/${be.uid}`, (v) => (v ? undefined : target))
      },
      // Only closes when the votes really are all in, judged on the room as the database has it.
      closeVoting: () => step('vote', pub.round, (p) => (allVoted(p) ? applyPrvi(p, scorePrvi(p)) : undefined)),
      next: () => isHost && step('result', pub.round, (p) => nextPrviRound(p)),
      newGame: () => isHost && step('over', pub.round, (p) => resetPrviLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // Move on automatically once everyone has voted. Any phone may do it.
  useEffect(() => {
    if (pub.phase === 'vote' && allVoted(pub)) void actions.closeVoting()
  }, [pub, actions])

  return actions
}

export type PrviActions = ReturnType<typeof usePrviActions>

/** For screens: this phone's confirmed vote, if any. */
export const myVote = (pub: Pub, uid: string): string | undefined => prviOf(pub).votes?.[uid]
