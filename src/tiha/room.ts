import { useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import { nextTiha, playCard, resetTihaLobby, signal, startTiha, takeTask } from './logic'
import type { TihaCard, TihaMark } from './types'

/**
 * Every Tiha misija action. All go through transactions, so double taps and both phones tapping
 * "Dalje" at once are harmless. With only two players, either of them may move the game on.
 */
export function useTihaActions(be: Backend, code: string, pub: Pub) {
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
      start: () => isHost && step('lobby', pub.round, (p) => startTiha(p, Math.random)),
      take: (taskId: number) => step('draft', pub.round, (p) => takeTask(p, be.uid, taskId)),
      signal: (card: TihaCard, mark: TihaMark) => step('play', pub.round, (p) => signal(p, be.uid, card, mark)),
      play: (card: TihaCard) => step('play', pub.round, (p) => playCard(p, be.uid, card)),
      next: () => step('result', pub.round, (p) => nextTiha(p, Math.random)),
      rematch: () => step('over', pub.round, (p) => startTiha(p, Math.random)),
      lobby: () => isHost && step('over', pub.round, resetTihaLobby),
    }
  }, [be, pub.round, isHost, pubPath])
}

export type TihaActions = ReturnType<typeof useTihaActions>
