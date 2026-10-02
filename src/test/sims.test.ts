import { describe, expect, it } from 'vitest'
import { playerOrder } from '../game/logic'
import { misijaOf, wins as missionWins } from '../misija/logic'
import { HAND, licOf, WINS_NEEDED } from '../lic/logic'
import { simBlef, simKviz, simLic, simMisija, simUljez, simWave, type Snapshot } from './sims'

// Whole games played by bots through the real rules, with Firebase's data shape between every step.
// Many seeds, so rare paths (two impostors, ties, Pljačka on a leader, forced teams) all come up.
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 13)

function scoresOk(s: Snapshot) {
  for (const uid of playerOrder(s.pub)) expect(typeof (s.pub.scores?.[uid] ?? 0), s.label).toBe('number')
}

describe('simulated games end cleanly under Firebase shapes', () => {
  it.each(SEEDS)('Uljez seed %i', (seed) => {
    for (const n of [3, 4, 5]) {
      const snaps = simUljez(seed, n)
      const last = snaps.at(-1)!
      expect(last.pub.phase).toBe('over')
      // quick mode: someone reached 5, and every point came from a round result
      expect(Math.max(...Object.values(last.pub.scores ?? {}))).toBeGreaterThanOrEqual(5)
      snaps.forEach(scoresOk)
      for (const s of snaps) for (const v of Object.values(s.pub.scores ?? {})) expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(SEEDS)('Blef seed %i', (seed) => {
    for (const n of [3, 4, 5]) {
      const snaps = simBlef(seed, n)
      expect(snaps.at(-1)!.pub.phase).toBe('over')
      expect(snaps.at(-1)!.pub.round).toBe(8)
      for (const s of snaps.filter((x) => x.pub.phase === 'pick')) {
        const options = s.pub.blef?.options ?? []
        expect(options.filter((o) => o.kind === 'truth'), s.label).toHaveLength(1)
        // Everyone can pick the truth and at least one fake that is not theirs. Usually four or more, but each
        // question has only two house fakes, so with three players who write those very fakes it can drop to two.
        for (const uid of playerOrder(s.pub))
          expect(options.filter((o) => !(o.owners ?? []).includes(uid)).length, s.label).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it.each(SEEDS)('Talas seed %i', (seed) => {
    for (const n of [3, 4, 5]) {
      const snaps = simWave(seed, n)
      const over = snaps.at(-1)!
      expect(over.pub.phase).toBe('over')
      expect(over.pub.round).toBe(n * 2)
      // each player gives the clue exactly twice
      const givers = snaps.filter((s) => s.label.includes('chose a scale')).map((s) => s.label[0])
      for (const uid of playerOrder(over.pub)) expect(givers.filter((g) => g === uid)).toHaveLength(2)
    }
  })

  it.each(SEEDS)('Kviz seed %i', (seed) => {
    for (const n of [3, 5]) {
      const snaps = simKviz(seed, n)
      expect(snaps.at(-1)!.pub.phase).toBe('over')
      expect(snaps.at(-1)!.pub.round).toBe(15)
      snaps.forEach(scoresOk)
      // nobody is ever robbed below zero
      for (const s of snaps) for (const v of Object.values(s.pub.scores ?? {})) expect(v, s.label).toBeGreaterThanOrEqual(0)
      // at most one attack per victim and one card per attacker
      for (const s of snaps) {
        const from = Object.values(s.pub.kviz?.attacks ?? {}).map((a) => a.from).filter((f) => f !== 'haos')
        expect(new Set(from).size, s.label).toBe(from.length)
      }
    }
  })

  it.each(SEEDS)('Licitacija seed %i', (seed) => {
    const snaps = simLic(seed)
    const over = snaps.at(-1)!
    expect(over.pub.phase).toBe('over')
    expect(Math.max(...Object.values(licOf(over.pub).wins ?? {}))).toBe(WINS_NEEDED)
    // every game uses each bidding card exactly once per player
    for (const s of snaps.filter((x) => x.pub.phase === 'set' || x.pub.phase === 'over'))
      for (const uid of ['a', 'b']) expect([...(licOf(s.pub).played?.[uid] ?? [])].sort((x, y) => x - y)).toEqual(HAND)
  })

  it.each(SEEDS)('Misija seed %i', (seed) => {
    for (const n of [5, 6, 7, 8, 10, 12])
      for (const specials of [0, 1, 3, 5]) {
        const snaps = simMisija(seed, n, specials)
        const over = snaps.at(-1)!
        expect(over.pub.phase, `${n} players, ${specials} specials`).toBe('over')
        const m = misijaOf(over.pub)
        const w = missionWins(over.pub)
        expect(m.winner).toBeDefined()
        expect(w.ekipa + w.spijuni).toBeLessThanOrEqual(5)
        // the crew only wins by three missions, the spies by three missions or the shot
        if (m.winner === 'ekipa') expect(w.ekipa).toBe(3)
        if (m.winner === 'spijuni') expect(w.spijuni === 3 || m.shot).toBeTruthy()
        // never more than four rejected teams in a row: the fifth goes without a vote
        for (const s of snaps) expect(misijaOf(s.pub).rejects ?? 0).toBeLessThanOrEqual(4)
      }
  })
})
