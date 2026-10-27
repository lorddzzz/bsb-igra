import { useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import { nextLic, nextSet, placeBid, resetLicLobby, startLic } from './logic'

/**
 * Every Licitacija action. All go through transactions, so double taps and both phones tapping
 * "Dalje" at once are harmless. With only two players, either of them may move the game on.
 */
export function useLicActions(be: Backend, code: string, pub: Pub) {
  const isHost = pub.hostUid === be.uid
  const pubPath = `${roomPath(code)}/pub`

  return useMemo(() => {
    const step = (from: Phase, round: number, fn: (p: Pub) => Pub | undefined) =>
      be.transaction<Pub>(pubPath, (p) => {
        if (!p) return p
        if (p.phase !== from || p.round !== round) return undefined
        return fn(p)
      })

    return {
      kick: (uid: string) => be.set(`${pubPath}/players/${uid}`, null),
      start: () => isHost && step('lobby', pub.round, (p) => startLic(p, Math.random)),
      bid: (card: number) => step('bid', pub.round, (p) => placeBid(p, be.uid, card)),
      next: () => step('duel', pub.round, nextLic),
      nextSet: () => step('set', pub.round, (p) => nextSet(p, Math.random)),
      rematch: () => step('over', pub.round, (p) => startLic(p, Math.random)),
      lobby: () => isHost && step('over', pub.round, resetLicLobby),
    }
  }, [be, pub.round, isHost, pubPath])
}

export type LicActions = ReturnType<typeof useLicActions>
