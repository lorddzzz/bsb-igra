import { describe, expect, it } from 'vitest'
import { playerOrder } from '../game/logic'
import type { Pub } from '../game/types'
import type { MisijaSecret } from '../misija/types'
import { firebaseShape } from '../test/firebaseShape'
import { simBlef, simKviz, simLic, simMisija, simUljez, simWave, type Snapshot } from '../test/sims'
import { plural } from '../screens/Tabela'
import { gamesOf, nameKey, recordId, records, summarize, totals } from './logic'
import type { HistoryGame } from './types'

const last = (snaps: Snapshot[]) => snaps.at(-1)!
const rolesOf = (s: Snapshot) => (s.secret as { misija?: MisijaSecret } | null)?.misija?.roles
const save = (s: Snapshot, at = 1): HistoryGame => ({ ...summarize(s.pub, 'ABCD', rolesOf(s))!, at })

describe('nameKey', () => {
  it('treats case, spaces and accents as the same person', () => {
    expect(nameKey('  Dule ')).toBe('dule')
    expect(nameKey('DULÉ')).toBe('dule')
    expect(nameKey('Đorđe')).toBe(nameKey('djordje'))
    expect(nameKey('Šomi  Žika')).toBe('somi zika')
    expect(nameKey('Dule')).not.toBe(nameKey('Duki'))
  })
})

describe('summarize', () => {
  it('saves nothing before the game is over', () => {
    for (const s of simUljez(13, 4).slice(0, -1)) expect(summarize(s.pub, 'ABCD'), s.label).toBeNull()
  })

  it.each([3, 5, 8])('Uljez with %i players: winners are the top scorers, impostor counts add up', (n) => {
    const s = last(simUljez(7, n))
    const rec = save(s)
    expect(rec.game).toBe('uljez')
    expect(rec.players).toHaveLength(n)
    const top = Math.max(...rec.players.map((p) => p.points!))
    expect(rec.players.filter((p) => p.won).every((p) => p.points === top)).toBe(true)
    expect(rec.players.some((p) => p.won)).toBe(true)
    for (const p of rec.players) {
      const st = p.stats ?? {}
      expect((st.caught ?? 0) + (st.escaped ?? 0)).toBe(st.imp ?? 0)
    }
    // every round had at least one impostor
    const imps = rec.players.reduce((sum, p) => sum + (p.stats?.imp ?? 0), 0)
    expect(imps).toBeGreaterThanOrEqual(s.pub.round)
  })

  it('counts Blef, Talas and Kviz stats', () => {
    const blef = save(last(simBlef(13, 4)))
    expect(blef.players.some((p) => p.stats?.truth || p.stats?.fooled)).toBe(true)
    const kviz = save(last(simKviz(13, 4)))
    for (const p of kviz.players) expect(p.stats?.right ?? 0).toBeLessThanOrEqual(15)
    expect(kviz.players.some((p) => p.stats?.right)).toBe(true)
    const talas = save(last(simWave(13, 4)))
    expect(talas.players.every((p) => typeof p.points === 'number')).toBe(true)
  })

  it('Licitacija: the match winner wins, with games won as a stat', () => {
    const rec = save(last(simLic(13)))
    expect(rec.players.filter((p) => p.won)).toHaveLength(1)
    expect(rec.players.find((p) => p.won)!.stats?.sets).toBe(2)
    expect(rec.players.every((p) => p.points === undefined)).toBe(true)
  })

  it.each([5, 8, 12])('Misija with %i players: the winning side wins, and spies are marked', (n) => {
    const s = last(simMisija(13, n, 2))
    expect(summarize(s.pub, 'ABCD')).toBeNull() // needs roles
    const rec = save(s)
    const winner = s.pub.misija!.winner
    for (const p of rec.players) expect(p.won).toBe(p.side === winner)
    expect(rec.players.filter((p) => p.side === 'spijuni').every((p) => p.stats?.spy === 1)).toBe(true)
  })

  it('survives a trip through Firebase, and every phone gets the same id', () => {
    for (const s of [last(simUljez(3, 4)), last(simKviz(3, 4)), last(simLic(3)), last(simBlef(3, 3))]) {
      const rec = summarize(s.pub, 'ABCD')!
      const back = firebaseShape(rec)
      expect(gamesOf({ x: { ...back, at: 5 } })[0].players).toHaveLength(rec.players.length)
      const reshaped = firebaseShape(JSON.parse(JSON.stringify(s.pub)) as Pub)
      expect(recordId(reshaped, summarize(reshaped, 'ABCD')!)).toBe(recordId(s.pub, rec))
    }
  })

  it('gives two games in the same room different ids', () => {
    const a = last(simUljez(3, 4))
    const b = last(simUljez(4, 4))
    expect(recordId(a.pub, summarize(a.pub, 'ABCD')!)).not.toBe(recordId(b.pub, summarize(b.pub, 'ABCD')!))
    const k1 = last(simKviz(3, 4))
    const k2 = last(simKviz(5, 4))
    expect(recordId(k1.pub, summarize(k1.pub, 'ABCD')!)).not.toBe(recordId(k2.pub, summarize(k2.pub, 'ABCD')!))
  })
})

describe('totals and titles', () => {
  const g = (game: HistoryGame['game'], players: [string, boolean, number?, Record<string, number>?][], at = 1): HistoryGame => ({
    game,
    at,
    room: 'ABCD',
    players: players.map(([name, won, points, stats]) => ({ name, won, points, stats, badge: 'vuk' })),
  })

  it('adds up wins by name across spellings and ranks by wins', () => {
    const games = [
      g('uljez', [['Dule', true, 5, { escaped: 2 }], ['Marko', false, 3, { caught: 1 }]], 1),
      g('kviz', [['dule ', false, 4, { right: 4 }], ['Marko', true, 9, { right: 9 }]], 2),
      g('uljez', [['Dulé', true, 6, { escaped: 1 }], ['Marko', false, 2]], 3),
    ]
    const table = totals(games)
    expect(table.map((t) => [t.name, t.wins, t.games])).toEqual([
      ['Dulé', 2, 3],
      ['Marko', 1, 3],
    ])
    expect(table[0].stats['uljez.escaped']).toBe(3)
    expect(table[0].byGame.uljez).toEqual({ games: 2, wins: 2, points: 11 })
    const uljez = totals(games, 'uljez')
    expect(uljez[0].points).toBe(11)
    const titles = records(table)
    expect(titles.find((t) => t.record.stat === 'uljez.escaped')!.holders.map((h) => h.name)).toEqual(['Dulé'])
    expect(titles.find((t) => t.record.stat === 'kviz.right')!.value).toBe(9)
    expect(records(table, 'blef')).toEqual([])
  })

  it('reads whatever Firebase holds without crashing', () => {
    expect(gamesOf(null)).toEqual([])
    expect(gamesOf({ a: null, b: { game: 'uljez' }, c: { game: 'uljez', at: 2, players: { 0: { name: 'Ana', won: true } } } })).toHaveLength(1)
    expect(totals(gamesOf({ c: { game: 'kviz', at: 2, players: [{ name: '  ' }, { name: 'Ana' }] } }))).toHaveLength(1)
  })

  it('every simulated player ends up on the board once', () => {
    const s = last(simUljez(21, 5))
    const table = totals([save(s)])
    expect(table).toHaveLength(playerOrder(s.pub).length)
  })
})

describe('plural', () => {
  it('picks the Serbian form', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25, 101].map((n) => plural(n, 'pobeda', 'pobede', 'pobeda'))).toEqual([
      'pobeda', 'pobede', 'pobeda', 'pobeda', 'pobeda', 'pobeda', 'pobede', 'pobeda', 'pobeda',
    ])
    expect(plural(1, 'poen', 'poena', 'poena')).toBe('poen')
  })
})
