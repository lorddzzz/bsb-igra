import { useEffect, useRef } from 'react'
import type { Pub } from '../game/types'
import * as sound from './sound'

/** Personal ping on my phone whenever `mine` turns true, e.g. it's my turn to pick. `key` re-arms it (usually the round). */
export function useYourTurn(mine: boolean, key: unknown) {
  useEffect(() => {
    if (mine) sound.yourTurn()
  }, [mine, key])
}

/** Screens that bring their own big sound (drum roll, verdict, fanfare), so no swoosh on arrival. */
const OWN_SOUND = new Set(['reveal', 'truth', 'result', 'answer', 'over', 'question', 'duel', 'set'])

/**
 * Room-wide sounds from the host phone, the "stage speaker": background music while in a room,
 * a chime when someone checks in, the boarding call when a game starts and a swoosh between screens.
 */
export function useStageSounds(pub: Pub | null | undefined, me: string) {
  const isHost = Boolean(pub && pub.hostUid === me)
  const phase = pub?.phase
  const players = Object.keys(pub?.players ?? {}).length

  useEffect(() => {
    sound.setMusic(isHost)
    return () => sound.setMusic(false)
  }, [isHost])

  const seen = useRef({ phase, players })
  useEffect(() => {
    const before = seen.current
    seen.current = { phase, players }
    if (!isHost || !phase) return
    if (phase === 'lobby' && players > before.players && before.phase === 'lobby') sound.joinChime()
    if (!before.phase || before.phase === phase) return
    if (before.phase === 'lobby') sound.boarding()
    else if (!OWN_SOUND.has(phase)) sound.whoosh()
  }, [isHost, phase, players])
}
