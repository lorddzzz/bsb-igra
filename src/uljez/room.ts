import { useEffect, useMemo } from 'react'
import type { Backend } from '../backend'
import { roomPath, type RoomView } from '../game/room'
import { MAX_VOTES, type Mode, type Phase, type Pub } from '../game/types'
import { playerOrder } from '../game/util'
import {
  allGuessed,
  allVoted,
  applyRound,
  caughtImpostors,
  newGameSeed,
  nextRound,
  pickerFor,
  resetToLobby,
  scoreRound,
  setupRound,
  votesOf,
} from './logic'

/** Every action a player can take. Phase changes go through transactions, so double taps are harmless. */
export function useUljezActions(be: Backend, code: string, view: RoomView) {
  const { pub, secret } = view
  const roundSecret = secret && pub && secret.round === pub.round ? secret : null
  const isHost = pub?.hostUid === be.uid
  const pubPath = `${roomPath(code)}/pub`

  const actions = useMemo(() => {
    const step = (from: Phase, round: number, fn: (p: Pub) => Pub | undefined) =>
      be.transaction<Pub>(pubPath, (p) => {
        if (!p) return p
        if (p.phase !== from || p.round !== round) return undefined
        return fn(p)
      })

    return {
      setMode: (mode: Mode) => be.set(`${pubPath}/mode`, mode),
      kick: (uid: string) => be.set(`${pubPath}/players/${uid}`, null),
      startGame: () =>
        pub &&
        step('lobby', pub.round, (p) => ({
          ...resetToLobby(p),
          phase: 'category',
          round: 1,
          seed: newGameSeed(Math.random),
          pickerOffset: Math.floor(Math.random() * playerOrder(p).length),
          scores: Object.fromEntries(playerOrder(p).map((uid) => [uid, 0])),
        })),
      pickCategory: async (categoryId: string) => {
        if (!pub || pub.phase !== 'category' || pickerFor(pub) !== be.uid) return
        const setup = setupRound(pub, categoryId, Math.random)
        const patch: Record<string, unknown> = { secret: setup.secret }
        for (const [uid, t] of Object.entries(setup.tickets)) patch[`tickets/${uid}`] = t
        await be.update(roomPath(code), patch)
        await step('category', pub.round, (p) => ({ ...p, phase: 'clues', category: categoryId, starter: setup.starter }))
      },
      toVoting: () => isHost && pub && step('clues', pub.round, (p) => ({ ...p, phase: 'voting' })),
      /** Adds or removes a suspect; at most MAX_VOTES, and not after confirming. */
      vote: (target: string) => {
        if (pub?.phase !== 'voting' || pub.locked?.[be.uid]) return
        const mine = votesOf(pub, be.uid)
        if (mine.includes(target)) {
          if (typeof pub.votes?.[be.uid] === 'string') return be.set(`${pubPath}/votes/${be.uid}`, null)
          return be.set(`${pubPath}/votes/${be.uid}/${target}`, null)
        }
        if (mine.length >= MAX_VOTES) return
        return be.set(`${pubPath}/votes/${be.uid}/${target}`, true)
      },
      lockVote: () =>
        pub?.phase === 'voting' && votesOf(pub, be.uid).length > 0 && be.set(`${pubPath}/locked/${be.uid}`, true),
      closeVoting: () => pub && step('voting', pub.round, (p) => ({ ...p, phase: 'reveal' })),
      afterReveal: () =>
        isHost &&
        pub &&
        roundSecret &&
        step('reveal', pub.round, (p) =>
          caughtImpostors(p, roundSecret).length ? { ...p, phase: 'guess' } : applyRound(p, scoreRound(p, roundSecret)),
        ),
      // The last caught impostor to guess also closes the round.
      guess: (word: string) =>
        pub &&
        roundSecret &&
        step('guess', pub.round, (p) => {
          const next = { ...p, guesses: { ...(p.guesses ?? {}), [be.uid]: word } }
          return allGuessed(next, roundSecret) ? applyRound(next, scoreRound(next, roundSecret)) : next
        }),
      finishGuessing: () =>
        pub && roundSecret && step('guess', pub.round, (p) => applyRound(p, scoreRound(p, roundSecret))),
      nextRound: () => isHost && pub && step('score', pub.round, (p) => nextRound(p)),
      newGame: () => isHost && pub && step('over', pub.round, (p) => resetToLobby(p)),
    }
  }, [be, code, pub, roundSecret, isHost, pubPath])

  // Move on automatically once everyone has voted / guessed. Any phone may do it.
  useEffect(() => {
    if (pub?.phase === 'voting' && allVoted(pub)) void actions.closeVoting()
  }, [pub, actions])
  useEffect(() => {
    if (pub?.phase === 'guess' && roundSecret && allGuessed(pub, roundSecret)) void actions.finishGuessing()
  }, [pub, roundSecret, actions])
  // A phone still on the old version may move the room into the removed missions screen; score the round instead.
  useEffect(() => {
    if ((pub?.phase as string) === 'missions' && roundSecret)
      void be.transaction<Pub>(`${roomPath(code)}/pub`, (p) =>
        p && (p.phase as string) === 'missions' && p.round === roundSecret.round
          ? applyRound(p, scoreRound(p, roundSecret))
          : undefined,
      )
  }, [be, code, pub, roundSecret])

  return actions
}

export type UljezActions = ReturnType<typeof useUljezActions>
