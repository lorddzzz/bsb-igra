import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import type { Backend } from '../backend'
import { createRoom, joinRoom, useRoom, type RoomView } from '../game/room'
import type { GameId } from '../game/types'
import { ALL_BADGES } from '../game/types'
import { MemoryDb } from './memoryBackend'

/** Lets queued listener callbacks and the effects they trigger run. */
export async function settle(rounds = 6) {
  for (let i = 0; i < rounds; i++) await act(async () => {})
}

export interface Phone<A> {
  be: Backend
  /** The room as this phone sees it right now, and its actions. */
  readonly view: RoomView
  readonly actions: A
  unmount: () => void
}

/**
 * A simulated phone: the real useRoom hook plus a game's actions hook, rendered headless against
 * the shared in-memory database. Several phones on one MemoryDb behave like friends in one room.
 */
export function phone<A>(be: Backend, code: string, useActions: (be: Backend, code: string, view: RoomView) => A): Phone<A> {
  const latest: { view: RoomView | null; actions: A | null } = { view: null, actions: null }
  // games' action hooks need the room to be loaded, as the real screens only mount then
  function Actions({ view }: { view: RoomView }) {
    latest.actions = useActions(be, code, view)
    return null
  }
  function Root() {
    const view = useRoom(be, code)
    latest.view = view
    if (!view.pub) latest.actions = null
    return view.pub ? createElement(Actions, { view }) : null
  }
  const r = render(createElement(Root))
  return {
    be,
    get view() {
      return latest.view!
    },
    get actions() {
      if (!latest.actions) throw new Error(`phone ${be.uid} has no room loaded`)
      return latest.actions
    },
    unmount: r.unmount,
  }
}

/** A room with n players already checked in: a (the host), b, c... */
export async function room(game: GameId, n: number, db = new MemoryDb()) {
  const uids = 'abcdefghijkl'.split('').slice(0, n)
  const host = db.phone('a')
  const code = await createRoom(host, game)
  for (const [i, uid] of uids.entries()) {
    db.clock += 1
    const err = await joinRoom(db.phone(uid), code, `Igrač ${uid}`, ALL_BADGES[i].id)
    if (err) throw new Error(err)
  }
  return { db, code, uids }
}
