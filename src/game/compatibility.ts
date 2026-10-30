import { gameDefinition } from '../games'

/** Bump only when room data or moves become incompatible, not on every deployment. */
export const ROOM_PROTOCOL = 1

export function roomCompatible(pub: { game?: unknown; protocol?: unknown }): boolean {
  return (pub.game === undefined || typeof pub.game === 'string') &&
    !!gameDefinition(pub.game as string | undefined) &&
    (pub.protocol === undefined || pub.protocol === ROOM_PROTOCOL)
}
