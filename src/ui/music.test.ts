import { describe, expect, it } from 'vitest'
import { stepLength, swungTime, TRACKS } from './music'

describe('music', () => {
  it('has its own track for every game', () => {
    const games = ['uljez', 'blef', 'talas', 'kviz', 'licitacija', 'misija'] as const
    for (const g of games) expect(TRACKS[g]).toBeDefined()
    expect(new Set(games.map((g) => TRACKS[g].name)).size).toBe(games.length)
  })

  it('swings only the off-beat sixteenths, and only in swung tracks', () => {
    const blef = TRACKS.blef
    expect(swungTime(blef, 0, 10)).toBe(10)
    expect(swungTime(blef, 1, 10)).toBeCloseTo(10 + blef.swing * stepLength(blef))
    expect(swungTime(TRACKS.kviz, 1, 10)).toBe(10)
  })
})
