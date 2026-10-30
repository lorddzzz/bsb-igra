import type { Backend } from '../backend'
import { roomCompatible } from './compatibility'
import { roomPath } from './room'
import type { Pub } from './types'

/** Allow a short reconnect before offering an explicit host change. Also enforced by database rules. */
export const HOST_GRACE_MS = 15_000

export function hostOffline(online: Record<string, true | number>, hostUid: string, now: number): boolean {
  const at = online[hostUid]
  return typeof at === 'number' && Number.isFinite(at) && at <= now - HOST_GRACE_MS
}

export async function takeOverHost(be: Backend, code: string, oldHost: string): Promise<boolean> {
  const online = (await be.get(`${roomPath(code)}/online`) ?? {}) as Record<string, true | number>
  if (online[be.uid] !== true || !hostOffline(online, oldHost, be.serverNow())) return false
  // The transaction serializes competing candidates. Rules recheck presence at commit, so a
  // reconnect between the read above and the transaction cannot steal an online host's role.
  return be.transaction<Pub>(`${roomPath(code)}/pub`, (pub) => {
    if (!pub) return pub
    if (!roomCompatible(pub) || pub.hostUid !== oldHost || oldHost === be.uid || !pub.players?.[be.uid]) return undefined
    return { ...pub, hostUid: be.uid }
  })
}
