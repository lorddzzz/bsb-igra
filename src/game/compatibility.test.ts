import { describe, expect, it } from 'vitest'
import { ROOM_PROTOCOL, roomCompatible } from './compatibility'
import { screensFor } from '../gameScreens'

describe('room compatibility', () => {
  it('accepts legacy rooms and compatible protocol releases', () => {
    expect(roomCompatible({})).toBe(true)
    expect(roomCompatible({ game: 'misija' })).toBe(true)
    expect(roomCompatible({ game: 'kviz', protocol: ROOM_PROTOCOL })).toBe(true)
    expect(screensFor(undefined)).toBe(screensFor('uljez'))
  })
  it.each(['future-game', '', 'toString', '__proto__', null, 3])('rejects unknown game %j', (game) => {
    expect(roomCompatible({ game })).toBe(false)
    if (typeof game === 'string') expect(screensFor(game)).toBeUndefined()
  })
  it.each([0, 2, '1', null, NaN])('rejects incompatible or malformed protocol %j', (protocol) => {
    expect(roomCompatible({ game: 'uljez', protocol })).toBe(false)
  })
})
