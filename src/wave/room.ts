import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  allAimed,
  applyWave,
  clueGiver,
  guessers,
  MAX_CLUE_LENGTH,
  nextWaveRound,
  resetWaveLobby,
  scoreWave,
  startWave,
  waveOf,
} from './logic'

/** Every Talasna dužina action. Phase changes go through transactions, so double taps are harmless. */
export function useWaveActions(be: Backend, code: string, pub: Pub) {
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
      start: () => isHost && step('lobby', pub.round, (p) => startWave(p, Math.random)),
      chooseScale: (id: string) =>
        pub.phase === 'clue' && clueGiver(pub) === be.uid && be.set(`${pubPath}/wave/scale`, id),
      giveClue: (clue: string) =>
        step('clue', pub.round, (p) =>
          clueGiver(p) === be.uid && waveOf(p).scale
            ? { ...p, phase: 'aim', wave: { ...waveOf(p), clue: clue.trim().slice(0, MAX_CLUE_LENGTH) } }
            : undefined,
        ),
      aim: (value: number) =>
        pub.phase === 'aim' &&
        guessers(pub).includes(be.uid) &&
        be.set(`${pubPath}/wave/guesses/${be.uid}`, Math.round(Math.min(100, Math.max(0, value)))),
      closeAim: () => step('aim', pub.round, (p) => applyWave(p, scoreWave(p))),
      next: () => isHost && step('result', pub.round, (p) => nextWaveRound(p, Math.random)),
      newGame: () => isHost && step('over', pub.round, (p) => resetWaveLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // Reveal automatically once every guesser has locked in. Any phone may do it.
  useEffect(() => {
    if (pub.phase === 'aim' && allAimed(pub)) void actions.closeAim()
  }, [pub, actions])

  return actions
}

export type WaveActions = ReturnType<typeof useWaveActions>
