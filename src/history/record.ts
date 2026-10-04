import { useEffect, useRef } from 'react'
import type { Backend } from '../backend'
import { roomPath } from '../game/room'
import type { Pub } from '../game/types'
import type { MisijaSecret } from '../misija/types'
import { recordId, summarize } from './logic'

export const HISTORY_PATH = 'history'

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
      let roles
      if (pub.game === 'misija') {
        const secret = (await be.get(`${roomPath(code)}/secret/misija`)) as MisijaSecret | null
        if (secret?.game !== pub.misija?.game) return
        roles = secret?.roles
      }
      const record = summarize(pub, code, roles)
      if (!record || !live) return
      const id = recordId(pub, record)
      if (tried.current === id) return
      tried.current = id
      await be.transaction(`${HISTORY_PATH}/${id}`, (cur) => (cur ? undefined : { ...record, at: be.serverNow() }))
    })().catch(() => {
      // No write access yet (rules not updated) or offline: the scoreboard just misses this game.
    })
    return () => {
      live = false
    }
  }, [be, code, pub])
}
