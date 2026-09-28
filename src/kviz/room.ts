import { useEffect, useMemo, useState } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Phase, Pub } from '../game/types'
import {
  allAnswered,
  ANSWER_SECONDS,
  applyKviz,
  GRACE_MS,
  kvizOf,
  leadSeconds,
  nextQuestion,
  resetKvizLobby,
  REVEAL_SECONDS,
  scoreKviz,
  startKviz,
} from './logic'

/** If the host's phone goes quiet (locked screen, lost signal), any other phone moves on this much later. */
const BACKUP_MS = 4000

// When this phone first saw each question or reveal. Phones never agree on the exact time, so each
// counts down from the moment the question reached it; the host closes the question for everyone.
const firstSeen = new Map<string, number>()
/** Clock moves this phone already asked for, so it doesn't send one every tick while waiting. */
const fired = new Set<string>()

/** Milliseconds since this phone first saw `key`, updated about ten times a second. */
export function useElapsed(key: string): number {
  if (!firstSeen.has(key)) firstSeen.set(key, performance.now())
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [key])
  return Math.max(0, now - firstSeen.get(key)!)
}

/** Names one question's (or one reveal's) clock. */
export const clockKey = (code: string, pub: Pub) => `${code}/${kvizOf(pub).game}/${pub.phase}/${pub.round}`

/** Every Kviz action. Phase changes go through transactions, so double taps and racing phones are harmless. */
export function useKvizActions(be: Backend, code: string, pub: Pub) {
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
      start: () => isHost && step('lobby', pub.round, (p) => startKviz(p, Math.random)),
      answer: (option: number) =>
        pub.phase === 'question' &&
        kvizOf(pub).answers?.[be.uid] === undefined &&
        be.set(`${pubPath}/kviz/answers/${be.uid}`, option),
      close: () => step('question', pub.round, (p) => applyKviz(p, scoreKviz(p))),
      next: () => step('answer', pub.round, (p) => nextQuestion(p, Math.random)),
      newGame: () => isHost && step('over', pub.round, (p) => resetKvizLobby(p)),
    }
  }, [be, pub, isHost, pubPath])

  // The clock: the host closes the question when time is up (or everyone has answered) and moves on
  // after the reveal. Other phones only step in if the host has gone quiet.
  const key = clockKey(code, pub)
  const elapsed = useElapsed(key)
  const backup = isHost ? 0 : BACKUP_MS
  useEffect(() => {
    let move: (() => Promise<boolean>) | null = null
    if (pub.phase === 'question') {
      const limit = (leadSeconds(pub.round) + ANSWER_SECONDS) * 1000 + GRACE_MS + backup
      if (allAnswered(pub) || elapsed >= limit) move = actions.close
    } else if (pub.phase === 'answer') {
      if (elapsed >= REVEAL_SECONDS * 1000 + backup) move = actions.next
    }
    if (!move || fired.has(key)) return
    fired.add(key)
    move().catch(() => fired.delete(key))
  }, [pub, actions, elapsed, backup, key])

  return { ...actions, elapsed }
}

export type KvizActions = ReturnType<typeof useKvizActions>
