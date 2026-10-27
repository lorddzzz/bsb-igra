import { describe, expect, it } from 'vitest'
import { asList, normalizeSecret } from './util'

describe('reading from the database', () => {
  it('accepts lists as arrays, numeric-key objects, or missing', () => {
    expect(asList(['a', 'b'])).toEqual(['a', 'b'])
    expect(asList({ 0: 'a', 1: 'b' })).toEqual(['a', 'b'])
    expect(asList(undefined)).toEqual([])
    expect(asList(true)).toEqual([])
  })

  it('upgrades a round secret written by the old version', () => {
    const s = normalizeSecret({ round: 1, impostor: 'd', word: 'Pica', category: 'hrana', options: { 0: 'Pica' } })
    expect(s?.impostors).toEqual(['d'])
    expect(s?.options).toEqual(['Pica'])
  })
})
