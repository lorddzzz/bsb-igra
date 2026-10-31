import { useEffect, useRef } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Pub } from '../game/types'
import type { MisijaSecret } from '../misija/types'
import { recordId, summarize } from './logic'

export const HISTORY_PATH = 'history'

/** The scoreboard entry for a finished game, or null when this phone should not save one. */
async function prepare(be: Backend, code: string, pub: Pub) {
  if (pub.phase !== 'over' || !pub.players?.[be.uid]) return null
  let roles
  if (pub.game === 'misija') {
    const secret = (await be.get(`${roomPath(code)}/secret/misija`)) as MisijaSecret | null
    if (secret?.game !== pub.misija?.game) return null
    roles = secret?.roles
  }
  const record = summarize(pub, code, roles)
  return record ? { record, id: recordId(pub, record) } : null
}

const save = (be: Backend, id: string, record: NonNullable<Awaited<ReturnType<typeof prepare>>>['record']) =>
  be.transaction(`${HISTORY_PATH}/${id}`, (cur) => (cur ? undefined : { ...record, at: be.serverNow() }))

/** Saves the game now, for a phone about to delete the room. Errors are swallowed: the scoreboard just misses it. */
export async function recordGame(be: Backend, code: string, pub: Pub): Promise<void> {
  try {
    const entry = await prepare(be, code, pub)
    if (entry) await save(be, entry.id, entry.record)
  } catch {
    // No write access yet (rules not updated) or offline.
  }
}

/**
 * Saves a game to the all-time scoreboard when it ends. Every player's phone tries, so it is saved
 * even if the host's phone is asleep; the id is the same on every phone and only the first write lands.
 */
export function useRecordGame(be: Backend, code: string, pub: Pub | null) {
  const tried = useRef('')
  useEffect(() => {
    if (!pub || pub.phase !== 'over' || !pub.players?.[be.uid]) return
    let live = true
    void (async () => {
      const entry = await prepare(be, code, pub)
      if (!entry || !live) return
      if (tried.current === entry.id) return
      tried.current = entry.id
      await save(be, entry.id, entry.record)
    })().catch(() => {
      // No write access yet (rules not updated) or offline: the scoreboard just misses this game.
    })
    return () => {
      live = false
    }
  }, [be, code, pub])
}
