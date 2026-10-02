import { describe, expect, it } from 'vitest'
import type { Pub } from '../game/types'
import {
  afterReveal,
  allPlayed,
  allVoted,
  applyMission,
  closeVote,
  dealRoles,
  failsNeeded,
  introScript,
  leader,
  maxSpecials,
  mKey,
  proposeTeam,
  resetMisijaLobby,
  shoot,
  spyCount,
  startMisija,
  tallyMission,
  teamSize,
  ticketsFor,
} from './logic'
import type { Role } from './types'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const ids = 'abcdefgh'.split('')
const players = Object.fromEntries(ids.map((id, i) => [id, { name: id.toUpperCase(), badge: id, joinedAt: i + 1 }]))

function pub(extra: Partial<Pub> = {}): Pub {
  return { hostUid: 'a', game: 'misija', createdAt: 0, mode: 'normal', phase: 'team', round: 1, players, ...extra }
}

describe('setup tables', () => {
  it('has a third of the table as spies', () => {
    expect([5, 6, 7, 8, 9, 10, 11, 12].map(spyCount)).toEqual([2, 2, 3, 3, 3, 4, 4, 4])
  })
  it('grows the teams and needs two sabotages on mission 4 with 7+', () => {
    expect([1, 2, 3, 4, 5].map((m) => teamSize(8, m))).toEqual([3, 4, 4, 5, 5])
    expect(teamSize(5, 1)).toBe(2)
    expect(failsNeeded(8, 4)).toBe(2)
    expect(failsNeeded(6, 4)).toBe(1)
    expect(failsNeeded(8, 3)).toBe(1)
  })
  it('allows the Fan only with three spies', () => {
    expect(maxSpecials(6)).toBe(4)
    expect(maxSpecials(7)).toBe(5)
  })
})

describe('roles', () => {
  it('adds special roles in order', () => {
    for (let level = 0; level <= 5; level++) {
      const roles = Object.values(dealRoles(ids, level, seeded(level + 3)))
      const specials = ['menadzer', 'telohranitelj', 'imitator', 'senka', 'fan']
      specials.forEach((r, i) => expect(roles.includes(r as Role)).toBe(i < level))
      const spies = roles.filter((r) => ['spijun', 'imitator', 'senka', 'fan'].includes(r))
      expect(spies).toHaveLength(3)
    }
  })

  it('shows each role the right people', () => {
    const roles: Record<string, Role> = {
      a: 'menadzer',
      b: 'telohranitelj',
      c: 'imitator',
      d: 'senka',
      e: 'fan',
      f: 'ekipa',
      g: 'ekipa',
      h: 'ekipa',
    }
    const t = ticketsFor(roles, 'g1')
    expect(t.a.sees).toEqual(['c', 'e']) // not Senka
    expect(t.b.sees).toEqual(['a', 'c']) // Menadžer and the Imitator
    expect(t.c.sees).toEqual(['d']) // not the Fan
    expect(t.d.sees).toEqual(['c'])
    expect(t.e.sees).toEqual([])
    expect(t.f.sees).toEqual([])
  })
})

describe('a round', () => {
  it('starts with secret roles and a leader', () => {
    const s = startMisija(pub({ phase: 'lobby', round: 0, misija: { specials: 2, tally: { ekipa: 1 } } }), seeded(7))
    expect(s.pub.phase).toBe('intro')
    expect(s.pub.misija?.tally).toEqual({ ekipa: 1 })
    expect(Object.keys(s.tickets)).toHaveLength(8)
    expect(s.secret.roles).toBeDefined()
    expect(ids).toContain(leader(s.pub))
  })

  it('needs the right team size, then a majority', () => {
    const p = pub({ misija: { game: 'g', offset: 0, turn: 0, rejects: 0 } })
    expect(proposeTeam(p, ['a', 'b'])).toBeUndefined()
    const voting = proposeTeam(p, ['a', 'b', 'c'])!
    expect(voting.phase).toBe('vote')
    // 4 of 8 for is a tie: rejected, lead passes on
    const votes = Object.fromEntries(ids.map((id, i) => [id, i < 4]))
    const tied = { ...voting, misija: { ...voting.misija, votes } }
    expect(allVoted(tied)).toBe(true)
    const rejected = closeVote(tied)
    expect(rejected.phase).toBe('team')
    expect(rejected.misija?.rejects).toBe(1)
    expect(leader(rejected)).toBe('b')
    expect(rejected.misija?.lastVote?.approved).toBe(false)
    const approved = closeVote({ ...voting, misija: { ...voting.misija, votes: { ...votes, e: true } } })
    expect(approved.phase).toBe('mission')
  })

  it('sends the fifth proposal without a vote', () => {
    const p = pub({ misija: { game: 'g', offset: 0, turn: 4, rejects: 4 } })
    const next = proposeTeam(p, ['a', 'b', 'c'])!
    expect(next.phase).toBe('mission')
    expect(next.misija?.lastVote?.votes).toBeUndefined()
  })

  it('counts sabotages only from spies', () => {
    const p = pub({ phase: 'reveal', misija: { game: 'g', team: { a: true, b: true, c: true }, played: { a: true, b: true, c: true } } })
    expect(allPlayed(p)).toBe(true)
    const roles: Record<string, Role> = { a: 'ekipa', b: 'spijun', c: 'ekipa' }
    expect(tallyMission(p, { game: 'g', roles, plays: { [mKey(1)]: { a: false, b: false } } })).toBeNull()
    const r = tallyMission(p, { game: 'g', roles, plays: { [mKey(1)]: { a: false, b: false, c: true } } })!
    expect(r.fails).toBe(1)
    expect(r.ok).toBe(false)
    expect(tallyMission(p, { game: 'old', roles, plays: {} })).toBeNull()
  })
})

describe('the end', () => {
  const ok = { team: {}, fails: 0, needed: 1, ok: true }
  const bad = { ...ok, fails: 1, ok: false }

  it('moves on to the next mission', () => {
    const p = applyMission(pub({ phase: 'reveal', misija: { turn: 2, rejects: 2 } }), ok)
    const next = afterReveal(p)
    expect(next.phase).toBe('team')
    expect(next.round).toBe(2)
    expect(next.misija?.rejects).toBe(0)
    expect(next.misija?.turn).toBe(3)
  })

  it('ends on three failed missions', () => {
    const p = pub({ phase: 'reveal', round: 3, misija: { results: { m1: bad, m2: bad, m3: bad } } })
    const end = afterReveal(p)
    expect(end.phase).toBe('over')
    expect(end.misija?.winner).toBe('spijuni')
    expect(end.misija?.tally).toEqual({ spijuni: 1 })
  })

  it('gives the spies a shot at the Menadžer', () => {
    const results = { m1: ok, m2: bad, m3: ok, m4: ok }
    expect(afterReveal(pub({ phase: 'reveal', round: 4, misija: { results } })).misija?.winner).toBe('ekipa')
    const guess = afterReveal(pub({ phase: 'reveal', round: 4, misija: { specials: 1, results } }))
    expect(guess.phase).toBe('guess')
    const roles: Record<string, Role> = { a: 'menadzer', b: 'spijun' }
    expect(shoot(guess, 'a', roles).misija?.winner).toBe('spijuni')
    expect(shoot(guess, 'c', roles).misija?.winner).toBe('ekipa')
  })

  it('keeps the settings and the room tally for a new game', () => {
    const p = pub({ phase: 'over', misija: { specials: 3, tally: { ekipa: 2 }, game: 'x', results: { m1: ok } } })
    expect(resetMisijaLobby(p).misija).toEqual({ specials: 3, tally: { ekipa: 2 } })
  })
})

describe('the narrator', () => {
  it('only calls the roles in play', () => {
    const plain = introScript(0, 'Ana').map((l) => l.text).join(' ')
    expect(plain).toContain('Špijuni, otvorite oči')
    expect(plain).not.toContain('Menadž')
    expect(plain).toContain('Prvi vođa je Ana.')
    const two = introScript(2, 'Ana').map((l) => l.text).join(' ')
    expect(two).toContain('Telohranitelju, otvori oči i zapamti ko je Menadžer.')
    expect(two).not.toContain('Imitator')
    const all = introScript(5, 'Ana').map((l) => l.text).join(' ')
    expect(all).toContain('Senka, ti ne podižeš palac.')
    expect(all).toContain('Fan ostaje zatvorenih očiju.')
    expect(all).toContain('Menadžeru i Imitatore')
  })

  it('starts the game with the narrator', () => {
    expect(startMisija(pub({ phase: 'lobby', round: 0 }), seeded(1)).pub.phase).toBe('intro')
  })
})
