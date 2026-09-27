import { describe, expect, it } from 'vitest'
import { WAVE_SCALES } from '../data/waveScales'
import type { Pub } from '../game/types'
import {
  allAimed,
  applyWave,
  clueGiver,
  drawRound,
  guessers,
  nextWaveRound,
  pointsFor,
  resetWaveLobby,
  scoreWave,
  startWave,
  TURNS_EACH,
} from './logic'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const players = {
  a: { name: 'Ana', badge: 'aj', joinedAt: 1 },
  b: { name: 'Bojan', badge: 'brian', joinedAt: 2 },
  c: { name: 'Ceca', badge: 'howie', joinedAt: 3 },
}

function pub(extra: Partial<Pub> = {}): Pub {
  return {
    hostUid: 'a',
    game: 'talas',
    createdAt: 0,
    mode: 'normal',
    phase: 'aim',
    round: 1,
    players,
    scores: { a: 0, b: 0, c: 0 },
    wave: { total: 6, offset: 0, scale: 'w01', target: 50 },
    ...extra,
  }
}

describe('scales', () => {
  it('has plenty of distinct scales', () => {
    expect(WAVE_SCALES.length).toBeGreaterThanOrEqual(60)
    expect(new Set(WAVE_SCALES.map((s) => s.left + s.right)).size).toBe(WAVE_SCALES.length)
  })
})

describe('scoring', () => {
  it('gives 4 / 3 / 2 / 0 by distance', () => {
    expect(pointsFor(50, 50)).toBe(4)
    expect(pointsFor(54, 50)).toBe(4)
    expect(pointsFor(40, 50)).toBe(3)
    expect(pointsFor(66, 50)).toBe(2)
    expect(pointsFor(67, 50)).toBe(0)
  })

  it('gives the clue giver the best guess', () => {
    const p = pub({ wave: { total: 6, offset: 0, target: 50, guesses: { b: 52, c: 64 } } })
    const r = scoreWave(p)
    expect(r.gains.b.points).toBe(4)
    expect(r.gains.c.points).toBe(2)
    expect(r.gains.a.points).toBe(4)
    expect(applyWave(p, r).scores).toEqual({ a: 4, b: 4, c: 2 })
  })

  it('gives the clue giver nothing when everyone misses', () => {
    const p = pub({ wave: { total: 6, offset: 0, target: 10, guesses: { b: 90, c: 80 } } })
    expect(Object.values(scoreWave(p).gains).map((g) => g.points)).toEqual([0, 0, 0])
  })
})

describe('flow', () => {
  it('rotates the clue giver so everyone gives clues twice', () => {
    let p = startWave(pub({ phase: 'lobby', round: 0, wave: undefined }), seeded(3))
    expect(p.wave!.total).toBe(3 * TURNS_EACH)
    const givers: string[] = []
    while (p.phase !== 'over') {
      givers.push(clueGiver(p))
      expect(guessers(p)).not.toContain(clueGiver(p))
      expect(p.wave!.choices).toHaveLength(2)
      expect(p.wave!.target).toBeGreaterThanOrEqual(6)
      expect(p.wave!.target).toBeLessThanOrEqual(94)
      p = nextWaveRound({ ...p, phase: 'result' }, seeded(p.round + 10))
    }
    for (const uid of ['a', 'b', 'c']) expect(givers.filter((g) => g === uid)).toHaveLength(TURNS_EACH)
    expect(new Set(asSeen(p)).size).toBe(asSeen(p).length)
  })

  it('waits for every guesser, not the clue giver', () => {
    expect(allAimed(pub({ wave: { offset: 0, guesses: { b: 10 } } }))).toBe(false)
    expect(allAimed(pub({ wave: { offset: 0, guesses: { b: 10, c: 0 } } }))).toBe(true)
  })

  it('brings new scales in the next game', () => {
    const first = drawRound({}, seeded(1))
    const second = drawRound(first, seeded(2))
    expect(second.choices!.some((id) => first.choices!.includes(id))).toBe(false)
    const lobby = resetWaveLobby(pub({ wave: second }))
    expect(lobby.wave).toEqual({ seen: second.seen })
  })
})

function asSeen(p: Pub): string[] {
  return p.wave!.seen ?? []
}
