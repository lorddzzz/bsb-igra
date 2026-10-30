import { describe, expect, it } from 'vitest'
import { GAMES, gameDefinition } from './games'
import { ALL_BADGES, BADGES, EXTRA_BADGES } from './game/badges'
import {
  ALL_BADGES as legacyAllBadges,
  BADGES as legacyBadges,
  EXTRA_BADGES as legacyExtraBadges,
  badgesFor,
  type GameId,
} from './game/types'

const expected: Record<GameId, { maxPlayers: number; badgeCount: number }> = {
  uljez: { maxPlayers: 12, badgeCount: 12 },
  blef: { maxPlayers: 5, badgeCount: 5 },
  talas: { maxPlayers: 5, badgeCount: 5 },
  kviz: { maxPlayers: 5, badgeCount: 5 },
  licitacija: { maxPlayers: 2, badgeCount: 5 },
  misija: { maxPlayers: 12, badgeCount: 12 },
}

describe('game catalog', () => {
  it('has exactly one definition for every supported game', () => {
    expect(GAMES.map((game) => game.id).sort()).toEqual(Object.keys(expected).sort())
    for (const game of GAMES) {
      expect(gameDefinition(game.id)).toBe(game)
      expect(game.maxPlayers, game.id).toBe(expected[game.id].maxPlayers)
      expect(game.badges, game.id).toHaveLength(expected[game.id].badgeCount)
      expect(new Set(game.badges.map((badge) => badge.id)).size, game.id).toBe(game.badges.length)
      expect(game.badges.length, game.id).toBeGreaterThanOrEqual(game.maxPlayers)
      expect(badgesFor(game.id)).toBe(game.badges)
    }
  })

  it('resolves a missing ID as legacy Uljez', () => {
    expect(gameDefinition(undefined)).toBe(gameDefinition('uljez'))
    expect(badgesFor(undefined)).toBe(ALL_BADGES)
  })

  it.each(['unknown', '', 'ULJEZ', 'toString', '__proto__'])('does not accept unknown ID %j', (id) => {
    expect(gameDefinition(id)).toBeUndefined()
    expect(badgesFor(id)).toEqual([])
  })

  it('preserves the existing badge exports and choices', () => {
    expect(legacyBadges).toBe(BADGES)
    expect(legacyExtraBadges).toBe(EXTRA_BADGES)
    expect(legacyAllBadges).toBe(ALL_BADGES)
    expect(ALL_BADGES).toEqual([...BADGES, ...EXTRA_BADGES])
    expect(badgesFor('uljez')).toBe(ALL_BADGES)
    expect(badgesFor('misija')).toBe(ALL_BADGES)
    for (const id of ['blef', 'talas', 'kviz', 'licitacija']) {
      expect(badgesFor(id)).toBe(BADGES)
    }
  })
})
