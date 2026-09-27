import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  allPicked,
  allWrote,
  applyBlef,
  blefOf,
  buildOptions,
  currentQuestion,
  MAX_LIE_LENGTH,
  nextBlefRound,
  optionsOf,
  resetBlefLobby,
  scoreBlef,
  startBlef,
} from './logic'

/** Every Blef action. Phase changes go through transactions, so double taps are harmless. */
export function useBlefActions(be: Backend, code: string, pub: Pub) {
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
      start: () => isHost && step('lobby', pub.round, (p) => startBlef(p, Math.random)),
      writeLie: (text: string) =>
        pub.phase === 'write' &&
        !blefOf(pub).lies?.[be.uid] &&
        be.set(`${pubPath}/blef/lies/${be.uid}`, text.trim().slice(0, MAX_LIE_LENGTH)),
      closeWriting: () =>
        step('write', pub.round, (p) => ({
          ...p,
          phase: 'pick',
          blef: { ...blefOf(p), options: buildOptions(p, currentQuestion(p), Math.random) },
        })),
      pick: (optionId: string) => {
        if (pub.phase !== 'pick' || blefOf(pub).picks?.[be.uid]) return
        const option = optionsOf(pub).find((o) => o.id === optionId)
        if (!option || option.owners?.includes(be.uid)) return
        return be.set(`${pubPath}/blef/picks/${be.uid}`, optionId)
      },
      closePicking: () => step('pick', pub.round, (p) => applyBlef(p, scoreBlef(p))),
      next: () => isHost && step('truth', pub.round, (p) => nextBlefRound(p)),
      newGame: () => isHost && step('over', pub.round, (p) => resetBlefLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // Move on automatically once everyone has written / picked. Any phone may do it.
  useEffect(() => {
    if (pub.phase === 'write' && allWrote(pub)) void actions.closeWriting()
    if (pub.phase === 'pick' && allPicked(pub)) void actions.closePicking()
  }, [pub, actions])

  return actions
}

export type BlefActions = ReturnType<typeof useBlefActions>
