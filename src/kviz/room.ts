import { useEffect, useMemo, useState } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  allAnswered,
  applyKviz,
  GRACE_MS,
  kvizOf,
  nextQuestion,
  resetKvizLobby,
  scoreKviz,
  startKviz,
  timeLeft,
} from './logic'

/** If the host's phone goes quiet (locked screen, lost signal), any other phone moves on this much later. */
const BACKUP_MS = 3000

/** Clock moves this phone already asked for, so it doesn't send one every tick while waiting. */
const fired = new Set<string>()

/** The shared server clock, re-read about ten times a second. */
export function useServerNow(be: Backend): number {
  const [now, setNow] = useState(() => be.serverNow())
  useEffect(() => {
    const id = setInterval(() => setNow(be.serverNow()), 100)
    return () => clearInterval(id)
  }, [be])
  return now
}

/** Every Kviz action. Phase changes go through transactions, so double taps and racing phones are harmless. */
export function useKvizActions(be: Backend, code: string, pub: Pub) {
  const isHost = pub.hostUid === be.uid
  const pubPath = `${roomPath(code)}/pub`
  const now = useServerNow(be)

  const actions = useMemo(() => {
    const step = (from: Phase, round: number, fn: (p: Pub) => Pub | undefined) =>
      be.transaction<Pub>(pubPath, (p) => {
        if (!p) return p
        if (p.phase !== from || p.round !== round) return undefined
        return fn(p)
      })

    return {
      kick: (uid: string) => be.set(`${pubPath}/players/${uid}`, null),
      start: () => isHost && step('lobby', pub.round, (p) => startKviz(p, Math.random, be.serverNow())),
      answer: (option: number) =>
        pub.phase === 'question' &&
        kvizOf(pub).answers?.[be.uid] === undefined &&
        timeLeft(pub, be.serverNow()) > 0 &&
        be.set(`${pubPath}/kviz/answers/${be.uid}`, option),
      close: () => step('question', pub.round, (p) => applyKviz(p, scoreKviz(p), be.serverNow())),
      next: () => step('answer', pub.round, (p) => nextQuestion(p, Math.random, be.serverNow())),
      newGame: () => isHost && step('over', pub.round, (p) => resetKvizLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // Every phone counts down to the same deadlines written in the room. The host closes the question
  // when time is up (or everyone has answered) and moves on after the reveal; other phones step in
  // only if the host has gone quiet.
  const { game, endsAt = 0, nextAt = 0 } = kvizOf(pub)
  const key = `${code}/${game}/${pub.phase}/${pub.round}`
  const backup = isHost ? 0 : BACKUP_MS
  useEffect(() => {
    let move: (() => Promise<boolean>) | null = null
    if (pub.phase === 'question' && (allAnswered(pub) || now >= endsAt + GRACE_MS + backup)) move = actions.close
    if (pub.phase === 'answer' && now >= nextAt + backup) move = actions.next
    if (!move || fired.has(key)) return
    fired.add(key)
    move().catch(() => fired.delete(key))
  }, [pub, actions, now, endsAt, nextAt, backup, key])

  return { ...actions, now }
}

export type KvizActions = ReturnType<typeof useKvizActions>
