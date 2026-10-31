import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import type { CijaLevel } from '../data/cijaPrompts'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  allAnswered,
  allMatched,
  applyCija,
  cijaOf,
  cleanAnswer,
  clampRounds,
  closeAnswers,
  nextCijaRound,
  resetCijaLobby,
  scoreCija,
  startCija,
  validMatching,
} from './logic'

const LEVELS: CijaLevel[] = ['lagano', 'srednje', 'ljuto']

/** Every "Čije je ovo?" action. Phase changes go through transactions, so double taps are harmless. */
export function useCijaActions(be: Backend, code: string, pub: Pub) {
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
      setLevel: (level: CijaLevel) =>
        isHost && pub.phase === 'lobby' && LEVELS.includes(level) && be.set(`${pubPath}/cija/level`, level),
      setRounds: (rounds: number) =>
        isHost && pub.phase === 'lobby' && be.set(`${pubPath}/cija/rounds`, clampRounds(rounds)),
      start: () => isHost && step('lobby', pub.round, (p) => startCija(p, Math.random)),
      writeAnswer: (text: string) => {
        const clean = cleanAnswer(text)
        if (pub.phase !== 'write' || !clean || cijaOf(pub).answers?.[be.uid]) return
        return be.set(`${pubPath}/cija/answers/${be.uid}`, clean)
      },
      // Only closes when the answers really are all in, judged on the room as the database has it.
      closeWriting: () => step('write', pub.round, (p) => (allAnswered(p) ? closeAnswers(p, Math.random) : undefined)),
      match: (guess: Record<string, string>) => {
        if (pub.phase !== 'match' || cijaOf(pub).guesses?.[be.uid] || !validMatching(pub, be.uid, guess)) return
        return be.set(`${pubPath}/cija/guesses/${be.uid}`, guess)
      },
      closeMatching: () => step('match', pub.round, (p) => (allMatched(p) ? applyCija(p, scoreCija(p)) : undefined)),
      next: () => isHost && step('result', pub.round, (p) => nextCijaRound(p)),
      newGame: () => isHost && step('over', pub.round, (p) => resetCijaLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // Move on automatically once everyone has answered / matched. Any phone may do it.
  useEffect(() => {
    if (pub.phase === 'write' && allAnswered(pub)) void actions.closeWriting()
    if (pub.phase === 'match' && allMatched(pub)) void actions.closeMatching()
  }, [pub, actions])

  return actions
}

export type CijaActions = ReturnType<typeof useCijaActions>
