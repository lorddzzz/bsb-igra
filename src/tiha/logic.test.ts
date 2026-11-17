import { describe, expect, it } from 'vitest'
import type { Pub } from '../game/types'
import {
  DECK,
  generateTasks,
  handOf,
  HAND_SIZE,
  marksFor,
  nextTiha,
  pair,
  partnerOf,
  playable,
  playCard,
  resetTihaLobby,
  signal,
  startTiha,
  START_LIVES,
  takeTask,
  tasksOf,
  tihaOf,
  trickWinner,
} from './logic'
import type { TihaCard, TihaTask } from './types'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const players = {
  a: { name: 'Ana', badge: 'aj', joinedAt: 1 },
  b: { name: 'Bojan', badge: 'brian', joinedAt: 2 },
}

function lobby(): Pub {
  return { hostUid: 'a', game: 'tiha', createdAt: 0, mode: 'normal', phase: 'lobby', round: 0, players }
}

const started = (seed = 1) => startTiha(lobby(), seeded(seed))!

/** A mission in the 'play' phase with hand-built hands and tasks; a leads. */
function mission(
  a: TihaCard[],
  b: TihaCard[],
  tasks: Omit<TihaTask, 'id'>[],
  extra: Partial<NonNullable<Pub['tiha']>> = {},
): Pub {
  return {
    ...lobby(),
    phase: 'play',
    round: 1,
    tiha: {
      level: 1,
      lives: 3,
      cleared: 0,
      captain: 'a',
      hands: { a, b },
      hidden: [],
      tasks: tasks.map((t, id) => ({ id, ...t })),
      turn: 'a',
      table: [],
      won: { a: 0, b: 0 },
      tricks: 0,
      signals: {},
      ...extra,
    },
  }
}

/** Plays one trick: a leads `x`, b answers `y`. */
function trick(p: Pub, x: TihaCard, y: TihaCard, lead = 'a', follow = 'b'): Pub {
  const one = playCard(p, lead, x)
  expect(one).toBeDefined()
  const two = playCard(one!, follow, y)
  expect(two).toBeDefined()
  return two!
}

const win = (card: TihaCard, owner: string, extra: Partial<TihaTask> = {}) => ({ kind: 'win' as const, card, owner, ...extra })
const state = (p: Pub, id: number) => tasksOf(p)[id].state

describe('tiha deal', () => {
  it('has 31 distinct cards and deals 12, 12 and 7 hidden, all different', () => {
    expect(DECK).toHaveLength(31)
    expect(new Set(DECK).size).toBe(31)
    for (let seed = 1; seed <= 20; seed++) {
      const p = started(seed)
      const t = tihaOf(p)
      expect(handOf(p, 'a')).toHaveLength(12)
      expect(handOf(p, 'b')).toHaveLength(12)
      expect(t.hidden).toHaveLength(7)
      const all = [...handOf(p, 'a'), ...handOf(p, 'b'), ...t.hidden!]
      expect(all).toHaveLength(31)
      expect(new Set(all)).toEqual(new Set(DECK))
    }
  })

  it('starts level 1 with 3 lives, round 1, the first player as captain with the turn', () => {
    const p = started()
    expect(p.phase).toBe('draft')
    expect(p.round).toBe(1)
    expect(tihaOf(p)).toMatchObject({ level: 1, lives: START_LIVES, cleared: 0, captain: 'a', turn: 'a', tricks: 0, won: { a: 0, b: 0 } })
    expect(tasksOf(p)).toHaveLength(1)
  })

  it('needs exactly two players and the lobby or the end of a run', () => {
    const one = { ...lobby(), players: { a: players.a } }
    const three = { ...lobby(), players: { ...players, c: { name: 'Cana', badge: 'x', joinedAt: 3 } } }
    expect(startTiha(one, seeded(1))).toBeUndefined()
    expect(startTiha(three, seeded(1))).toBeUndefined()
    expect(startTiha({ ...lobby(), phase: 'draft' }, seeded(1))).toBeUndefined()
    expect(startTiha({ ...lobby(), phase: 'result' }, seeded(1))).toBeUndefined()
  })

  it('is deterministic for a seed', () => {
    expect(started(5)).toEqual(started(5))
  })

  it('pair and partnerOf use join order', () => {
    const p = lobby()
    expect(pair(p)).toEqual(['a', 'b'])
    expect(partnerOf(p, 'a')).toBe('b')
    expect(partnerOf(p, 'zzz')).toBeUndefined()
  })

  it('sorts a hand by colour then rank, trumps last', () => {
    const p = mission(['a1', 'y2', 'r7', 'g3', 'r1', 'b4'], [], [])
    expect(handOf(p, 'a')).toEqual(['r1', 'r7', 'g3', 'b4', 'y2', 'a1'])
  })
})

describe('tiha following and tricks', () => {
  it('the leader may play anything and the follower must follow the colour when able', () => {
    const p = mission(['r3', 'g1'], ['r5', 'g6', 'a1'], [win('r3', 'a')])
    expect(playable(p, 'a')).toEqual(['r3', 'g1'])
    expect(playable(p, 'b')).toEqual([])
    const lead = playCard(p, 'a', 'r3')!
    expect(playable(lead, 'b')).toEqual(['r5'])
    expect(playCard(lead, 'b', 'g6')).toBeUndefined()
    expect(playCard(lead, 'b', 'a1')).toBeUndefined()
  })

  it('without the led colour any card may be played, and a led trump must be followed', () => {
    const p = mission(['r3', 'a2'], ['g6', 'a1', 'b2'], [win('r3', 'a')])
    expect(playable(playCard(p, 'a', 'r3')!, 'b')).toEqual(['g6', 'b2', 'a1'])
    expect(playable(playCard(p, 'a', 'a2')!, 'b')).toEqual(['a1'])
  })

  it('trumps beat colours, the higher led colour wins, an off-colour card loses', () => {
    expect(trickWinner([{ uid: 'a', card: 'r7' }, { uid: 'b', card: 'a1' }])).toBe('b')
    expect(trickWinner([{ uid: 'a', card: 'a1' }, { uid: 'b', card: 'a3' }])).toBe('b')
    expect(trickWinner([{ uid: 'a', card: 'a3' }, { uid: 'b', card: 'a2' }])).toBe('a')
    expect(trickWinner([{ uid: 'a', card: 'r2' }, { uid: 'b', card: 'r5' }])).toBe('b')
    expect(trickWinner([{ uid: 'a', card: 'r5' }, { uid: 'b', card: 'r2' }])).toBe('a')
    expect(trickWinner([{ uid: 'a', card: 'r1' }, { uid: 'b', card: 'g7' }])).toBe('a')
  })

  it('the winner leads the next trick and the finished trick is recorded', () => {
    const p = mission(['r3', 'g1', 'b1'], ['r5', 'g6', 'b2'], [win('b1', 'a')])
    const one = trick(p, 'r3', 'r5')
    expect(tihaOf(one)).toMatchObject({ turn: 'b', tricks: 1, won: { a: 0, b: 1 } })
    expect(tihaOf(one).lastTrick).toEqual({ cards: [{ uid: 'a', card: 'r3' }, { uid: 'b', card: 'r5' }], winner: 'b' })
    expect(tihaOf(one).table).toEqual([])
    expect(handOf(one, 'a')).toEqual(['g1', 'b1'])
    expect(handOf(one, 'b')).toEqual(['g6', 'b2'])
    expect(playCard(one, 'a', 'g1')).toBeUndefined()
    expect(playable(one, 'b')).toEqual(['g6', 'b2'])
  })

  it('the first card passes the turn and stays on the table', () => {
    const one = playCard(mission(['r3', 'g1'], ['r5', 'g6'], [win('r3', 'a')]), 'a', 'r3')!
    expect(tihaOf(one).table).toEqual([{ uid: 'a', card: 'r3' }])
    expect(tihaOf(one).turn).toBe('b')
    expect(tihaOf(one).tricks).toBe(0)
  })

  it('refuses a card out of turn, not in hand, or outside the play phase', () => {
    const p = mission(['r3', 'g1'], ['r5', 'g6'], [win('r3', 'a')])
    expect(playCard(p, 'b', 'r5')).toBeUndefined()
    expect(playCard(p, 'a', 'y7')).toBeUndefined()
    expect(playCard(p, 'a', 'r5')).toBeUndefined()
    expect(playCard({ ...p, phase: 'draft' }, 'a', 'r3')).toBeUndefined()
  })
})

describe('tiha tasks', () => {
  const rest = ['b1', 'b2', 'b3']
  const rest2 = ['y1', 'y2', 'y3']

  it('a win task is done when its owner wins the trick with the card', () => {
    const p = mission(['r7', ...rest], ['r1', ...rest2], [win('r7', 'a'), win('b1', 'b')])
    const one = trick(p, 'r7', 'r1')
    expect(state(one, 0)).toBe('done')
    expect(state(one, 1)).toBeUndefined()
    expect(one.phase).toBe('play')
  })

  it('a win task fails when the partner wins the trick, whichever card is the lead', () => {
    const p = mission(['r1', ...rest], ['r7', ...rest2], [win('r1', 'a'), win('b1', 'b')])
    const one = trick(p, 'r1', 'r7')
    expect(one.phase).toBe('result')
    expect(state(one, 0)).toBe('failed')
    const q = mission(['r1', ...rest], ['r7', ...rest2], [win('r7', 'a')])
    expect(trick(q, 'r1', 'r7').phase).toBe('result')
  })

  it('winning a partner card with your own task works too', () => {
    const p = mission(['r7', ...rest], ['r1', ...rest2], [win('r1', 'a')])
    const one = trick(p, 'r7', 'r1')
    expect(state(one, 0)).toBe('done')
    expect(tihaOf(one).outcome).toBe('won')
  })

  it('ends the mission at once when all tasks are done, with the hands still holding cards', () => {
    const p = mission(['r7', ...rest], ['r1', ...rest2], [win('r7', 'a')])
    const one = trick(p, 'r7', 'r1')
    expect(one.phase).toBe('result')
    expect(tihaOf(one)).toMatchObject({ outcome: 'won', cleared: 1, lives: 3, turn: undefined })
    expect(handOf(one, 'a')).toHaveLength(3)
  })

  it('ends the mission at once on a failure and costs a life', () => {
    const p = mission(['r1', ...rest], ['r7', ...rest2], [win('r1', 'a'), win('b1', 'b')])
    const one = trick(p, 'r1', 'r7')
    expect(tihaOf(one)).toMatchObject({ outcome: 'lost', failedTask: 0, lives: 2, cleared: 0 })
    expect(playCard(one, 'b', 'b1')).toBeUndefined()
  })

  it('first: done when it is the first win task, failed when another one was done earlier', () => {
    const tasks = [win('r7', 'a', { order: 'first' }), win('g7', 'a')]
    const ok = trick(mission(['r7', 'g7', 'b1'], ['r1', 'g1', 'y1'], tasks), 'r7', 'r1')
    expect(state(ok, 0)).toBe('done')
    expect(ok.phase).toBe('play')
    const bad = trick(mission(['r7', 'g7', 'b1'], ['r1', 'g1', 'y1'], tasks), 'g7', 'g1')
    expect(bad.phase).toBe('result')
    expect(state(bad, 0)).toBe('failed')
    expect(tihaOf(bad).failedTask).toBe(0)
  })

  it('first: fails once a later task is done before it, among three tasks', () => {
    const tasks = [win('r7', 'a', { order: 'first' }), win('g7', 'a'), win('b7', 'a')]
    const p = trick(mission(['g7', 'r7', 'b7', 'y1'], ['g1', 'r1', 'b1', 'y2'], tasks), 'g7', 'g1')
    expect(p.phase).toBe('result')
    expect(tihaOf(p).failedTask).toBe(0)
  })

  it('last: done when fulfilled after the others, failed when others are still open', () => {
    const tasks = [win('r7', 'a'), win('g7', 'a', { order: 'last' })]
    const a = ['r7', 'g7', 'b1']
    const b = ['r1', 'g1', 'y1']
    let p = trick(mission(a, b, tasks), 'r7', 'r1')
    expect(p.phase).toBe('play')
    p = trick(p, 'g7', 'g1')
    expect(p.phase).toBe('result')
    expect(tihaOf(p).outcome).toBe('won')
    const bad = trick(mission(a, b, tasks), 'g7', 'g1')
    expect(bad.phase).toBe('result')
    expect(state(bad, 1)).toBe('failed')
  })

  it('first and last tasks together resolve in the right order', () => {
    const tasks = [win('r7', 'a', { order: 'first' }), win('g7', 'a'), win('b7', 'a', { order: 'last' })]
    let p = mission(['r7', 'g7', 'b7', 'y1'], ['r1', 'g1', 'b1', 'y2'], tasks)
    p = trick(p, 'r7', 'r1')
    p = trick(p, 'g7', 'g1')
    expect(p.phase).toBe('play')
    p = trick(p, 'b7', 'b1')
    expect(tihaOf(p).outcome).toBe('won')
  })

  it('two ordered win tasks in the same trick count as done together', () => {
    const tasks = [win('r7', 'a', { order: 'first' }), win('r1', 'a', { order: 'last' })]
    const p = trick(mission(['r7', 'b1'], ['r1', 'y1'], tasks), 'r7', 'r1')
    expect(tihaOf(p).outcome).toBe('won')
  })

  it('count: fails as soon as the owner has too many tricks', () => {
    const tasks: Omit<TihaTask, 'id'>[] = [{ kind: 'count', n: 1, owner: 'a' }]
    let p = mission(['r7', 'g7', 'b7', 'y7'], ['r1', 'g1', 'b1', 'y1'], tasks)
    p = trick(p, 'r7', 'r1')
    expect(p.phase).toBe('play')
    p = trick(p, 'g7', 'g1', 'a', 'b')
    expect(p.phase).toBe('result')
    expect(tihaOf(p)).toMatchObject({ outcome: 'lost', failedTask: 0 })
  })

  it('count 0 fails on the first trick won', () => {
    const p = trick(mission(['r7', 'g1'], ['r1', 'g2'], [{ kind: 'count', n: 0, owner: 'a' }]), 'r7', 'r1')
    expect(p.phase).toBe('result')
    expect(tihaOf(p).outcome).toBe('lost')
  })

  it('count: fails once the target cannot be reached with the tricks left', () => {
    // after trick 10 two remain; owner has 0 and needs 3, so it is lost at once
    const p = mission(['r1', 'r2', 'g1'], ['r3', 'r4', 'g2'], [{ kind: 'count', n: 3, owner: 'a' }], {
      tricks: 9,
      won: { a: 0, b: 9 },
    })
    const one = trick(p, 'r1', 'r3')
    expect(one.phase).toBe('result')
    expect(tihaOf(one)).toMatchObject({ outcome: 'lost', failedTask: 0, tricks: 10 })
  })

  it('count: an exact count stays open until trick 12, a miss at trick 12 fails', () => {
    const mk = (n: number) =>
      mission(['r7', 'g1'], ['r1', 'g2'], [{ kind: 'count', n, owner: 'a' }], { tricks: 10, won: { a: 0, b: 10 } })
    let p = trick(mk(1), 'r7', 'r1')
    expect(p.phase).toBe('play')
    expect(state(p, 0)).toBeUndefined()
    p = trick(p, 'g1', 'g2')
    expect(tihaOf(p)).toMatchObject({ outcome: 'won', tricks: 12 })
    expect(state(p, 0)).toBe('done')
    const q = trick(trick(mk(2), 'r7', 'r1'), 'g1', 'g2')
    expect(tihaOf(q).outcome).toBe('lost')
  })

  it('count: exact on the very last trick', () => {
    const p = mission(['r7'], ['r1'], [{ kind: 'count', n: 1, owner: 'a' }], { tricks: 11, won: { a: 0, b: 11 } })
    const one = trick(p, 'r7', 'r1')
    expect(state(one, 0)).toBe('done')
    expect(tihaOf(one)).toMatchObject({ outcome: 'won', tricks: 12 })
  })

  it('last: resolved only on trick 12, for the winner of that trick', () => {
    const tasks: Omit<TihaTask, 'id'>[] = [{ kind: 'last', owner: 'a' }]
    const early = trick(mission(['r7', 'g1'], ['r1', 'g2'], tasks, { tricks: 10 }), 'r7', 'r1')
    expect(early.phase).toBe('play')
    expect(state(early, 0)).toBeUndefined()
    expect(tihaOf(trick(early, 'g1', 'g2', 'a', 'b')).outcome).toBe('lost')
    const ok = trick(mission(['r7', 'g3'], ['r1', 'g2'], tasks, { tricks: 10 }), 'r7', 'r1')
    expect(tihaOf(trick(ok, 'g3', 'g2')).outcome).toBe('won')
  })

  it('a mission mixing task kinds needs all of them', () => {
    const tasks: Omit<TihaTask, 'id'>[] = [win('r7', 'a'), win('g3', 'b'), { kind: 'last', owner: 'b' }]
    let p = mission(['r7', 'g1'], ['r1', 'g3'], tasks, { tricks: 10, won: { a: 5, b: 5 } })
    p = trick(p, 'r7', 'r1')
    expect(p.phase).toBe('play')
    p = trick(p, 'g1', 'g3')
    expect(tihaOf(p).outcome).toBe('won')
  })

  it('a win task for a card that is never played fails after trick 12', () => {
    const p = mission(['r7'], ['r1'], [win('y1', 'a')], { tricks: 11, won: { a: 6, b: 5 } })
    expect(tihaOf(trick(p, 'r7', 'r1')).outcome).toBe('lost')
  })
})

describe('tiha draft', () => {
  const draft = (n: number): Pub => {
    const p = started()
    const tasks: TihaTask[] = Array.from({ length: n }, (_, id) => ({ id, kind: 'last' }))
    return { ...p, tiha: { ...p.tiha, tasks } }
  }

  it('captain first, then alternating, then the captain leads', () => {
    let p = draft(2)
    expect(takeTask(p, 'b', 0)).toBeUndefined()
    p = takeTask(p, 'a', 1)!
    expect(tihaOf(p).turn).toBe('b')
    expect(p.phase).toBe('draft')
    expect(takeTask(p, 'a', 0)).toBeUndefined()
    p = takeTask(p, 'b', 0)!
    expect(p.phase).toBe('play')
    expect(tihaOf(p).turn).toBe('a')
    expect(tasksOf(p).map((t) => t.owner)).toEqual(['b', 'a'])
  })

  it('with an odd count the captain gets one more', () => {
    const p = takeTask(takeTask(takeTask(draft(3), 'a', 0)!, 'b', 1)!, 'a', 2)!
    expect(tasksOf(p).map((t) => t.owner)).toEqual(['a', 'b', 'a'])
    expect(p.phase).toBe('play')
  })

  it('refuses a taken task, an unknown task and other phases', () => {
    const p = takeTask(draft(3), 'a', 0)!
    expect(takeTask(p, 'b', 0)).toBeUndefined()
    expect(takeTask(p, 'b', 9)).toBeUndefined()
    expect(takeTask({ ...p, phase: 'play' }, 'b', 1)).toBeUndefined()
  })
})

describe('tiha signals', () => {
  const p = mission(['r1', 'r5', 'r7', 'g4', 'a2', 'b3', 'b6'], ['y1'], [win('r5', 'a')])

  it('marks are true for the hand right now', () => {
    expect(marksFor(p, 'a', 'r7')).toEqual(['high'])
    expect(marksFor(p, 'a', 'r1')).toEqual(['low'])
    expect(marksFor(p, 'a', 'r5')).toEqual([])
    expect(marksFor(p, 'a', 'g4')).toEqual(['only'])
    expect(marksFor(p, 'a', 'b3')).toEqual(['low'])
    expect(marksFor(p, 'a', 'b6')).toEqual(['high'])
    expect(marksFor(p, 'a', 'a2')).toEqual([])
    expect(marksFor(p, 'a', 'y1')).toEqual([])
  })

  it('accepts a valid mark without changing the turn', () => {
    const q = signal(p, 'a', 'r7', 'high')!
    expect(tihaOf(q).signals).toEqual({ a: { card: 'r7', mark: 'high' } })
    expect(tihaOf(q).turn).toBe('a')
    expect(handOf(q, 'a')).toContain('r7')
    expect(signal(p, 'a', 'g4', 'only')).toBeDefined()
    expect(signal(p, 'a', 'r1', 'low')).toBeDefined()
  })

  it('refuses a false mark, a trump, a card not in hand and a mark on a middle card', () => {
    expect(signal(p, 'a', 'r7', 'low')).toBeUndefined()
    expect(signal(p, 'a', 'r7', 'only')).toBeUndefined()
    expect(signal(p, 'a', 'g4', 'high')).toBeUndefined()
    expect(signal(p, 'a', 'a2', 'only')).toBeUndefined()
    expect(signal(p, 'a', 'y1', 'only')).toBeUndefined()
    expect(signal(p, 'a', 'r5', 'high')).toBeUndefined()
  })

  it('refuses a second signal, even after the first card was played', () => {
    const q = signal(p, 'a', 'r7', 'high')!
    expect(signal(q, 'a', 'g4', 'only')).toBeUndefined()
    expect(marksFor(q, 'a', 'g4')).toEqual([])
    const played = playCard(q, 'a', 'r7')!
    expect(tihaOf(played).signals?.a).toEqual({ card: 'r7', mark: 'high' })
  })

  it('refuses a signal out of turn or outside play', () => {
    const q = mission(['r1'], ['y1', 'y2'], [win('r1', 'a')])
    expect(signal(q, 'b', 'y2', 'high')).toBeUndefined()
    expect(signal({ ...q, phase: 'draft' }, 'a', 'r1', 'only')).toBeUndefined()
    const lead = playCard(q, 'a', 'r1')!
    expect(signal(lead, 'a', 'r1', 'only')).toBeUndefined()
    expect(signal(lead, 'b', 'y2', 'high')).toBeDefined()
  })

  it('each player has their own signal', () => {
    let q = mission(['r1'], ['y1'], [win('r1', 'a')])
    q = signal(q, 'a', 'r1', 'only')!
    q = playCard(q, 'a', 'r1')!
    expect(signal(q, 'b', 'y1', 'only')).toBeDefined()
  })
})

describe('tiha lives and levels', () => {
  const lostMission = (lives: number, level = 3): Pub =>
    trick(mission(['r1', 'b1'], ['r7', 'y1'], [win('r1', 'a')], { lives, level, captain: 'a', cleared: 2 }), 'r1', 'r7')
  const wonMission = (level: number): Pub =>
    trick(mission(['r7', 'b1'], ['r1', 'y1'], [win('r7', 'a')], { level, captain: 'a', cleared: 2 }), 'r7', 'r1')

  it('a loss keeps the level, takes a life and gives a new deal with the other captain', () => {
    const r = lostMission(3)
    expect(tihaOf(r)).toMatchObject({ lives: 2, level: 3, cleared: 2 })
    const next = nextTiha(r, seeded(2))!
    expect(next.phase).toBe('draft')
    expect(next.round).toBe(2)
    expect(tihaOf(next)).toMatchObject({ level: 3, lives: 2, cleared: 2, captain: 'b', turn: 'b', tricks: 0 })
    expect(tihaOf(next).lastTrick).toBeUndefined()
    expect(tihaOf(next).outcome).toBeUndefined()
    expect(tihaOf(next).failedTask).toBeUndefined()
    expect(tihaOf(next).signals).toEqual({})
    expect(handOf(next, 'a')).toHaveLength(12)
    expect(tasksOf(next)).toHaveLength(2)
  })

  it('a win raises the level by one and counts the mission', () => {
    const r = wonMission(4)
    expect(tihaOf(r)).toMatchObject({ cleared: 3, lives: 3 })
    const next = nextTiha(r, seeded(2))!
    expect(tihaOf(next)).toMatchObject({ level: 5, cleared: 3, lives: 3 })
    expect(tasksOf(next).filter((t) => t.kind === 'win')).toHaveLength(3)
    expect(nextTiha(next, seeded(3))).toBeUndefined()
  })

  it('the captain alternates every deal', () => {
    let p = nextTiha(wonMission(1), seeded(1))!
    expect(tihaOf(p).captain).toBe('b')
    p = { ...p, phase: 'result' }
    expect(tihaOf(nextTiha(p, seeded(1))!).captain).toBe('a')
  })

  it('at 0 lives the run is over and the state is kept', () => {
    const r = lostMission(1)
    expect(tihaOf(r).lives).toBe(0)
    expect(r.phase).toBe('result')
    const over = nextTiha(r, seeded(1))!
    expect(over.phase).toBe('over')
    expect(tihaOf(over)).toMatchObject({ lives: 0, cleared: 2, level: 3, outcome: 'lost' })
    expect(nextTiha(over, seeded(1))).toBeUndefined()
  })

  it('a rematch from over starts a fresh run, and the lobby reset keeps the players', () => {
    const over = nextTiha(lostMission(1), seeded(1))!
    const again = startTiha(over, seeded(4))!
    expect(again.phase).toBe('draft')
    expect(again.round).toBe(1)
    expect(tihaOf(again)).toMatchObject({ level: 1, lives: 3, cleared: 0, captain: 'a' })
    const lob = resetTihaLobby(over)
    expect(lob).toMatchObject({ phase: 'lobby', round: 0, hostUid: 'a', game: 'tiha', players })
    expect(lob.tiha).toBeUndefined()
  })
})

describe('tiha generateTasks', () => {
  const NON_TRUMP = DECK.filter((c) => c[0] !== 'a')

  it('obeys the generation rules for levels 1 to 12 over many seeds', () => {
    const expectWins = [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
    for (let level = 1; level <= 12; level++)
      for (let seed = 1; seed <= 60; seed++) {
        const rng = seeded(seed * 31 + level)
        const hands = tihaOf(startTiha(lobby(), rng)!).hands!
        const tasks = generateTasks(level, hands, rng)
        const wins = tasks.filter((t) => t.kind === 'win')
        const counts = tasks.filter((t) => t.kind === 'count')
        const lasts = tasks.filter((t) => t.kind === 'last')
        expect(wins).toHaveLength(expectWins[level - 1])
        expect(tasks.map((t) => t.id).sort((x, y) => x - y)).toEqual(tasks.map((_, i) => i))
        expect(tasks.every((t) => t.owner === undefined && t.state === undefined)).toBe(true)
        const dealt = new Set([...hands.a, ...hands.b])
        const cards = wins.map((t) => t.card!)
        expect(new Set(cards).size).toBe(cards.length)
        expect(cards.every((c) => dealt.has(c) && NON_TRUMP.includes(c))).toBe(true)
        counts.forEach((t) => expect(t.n! >= 0 && t.n! <= 4).toBe(true))
        expect(wins.filter((t) => t.order)).toHaveLength(level === 3 || level >= 6 ? 1 : 0)
        expect(tasks.filter((t) => t.kind !== 'win' && t.order)).toHaveLength(0)
        expect(counts).toHaveLength(level === 5 ? 1 : level >= 7 ? counts.length : 0)
        expect(lasts).toHaveLength(level === 6 ? 1 : level >= 7 ? lasts.length : 0)
        if (level >= 7) expect(counts.length + lasts.length).toBe(1)
        expect(tasks).toHaveLength(wins.length + counts.length + lasts.length)
      }
  })

  it('uses only cards from the given hands and is deterministic for a seed', () => {
    const hands = { a: ['r1', 'g2', 'a1'], b: ['b3', 'y4', 'r5'] }
    const one = generateTasks(4, hands, seeded(9))
    expect(one).toEqual(generateTasks(4, hands, seeded(9)))
    expect(one.every((t) => ['r1', 'g2', 'b3', 'y4', 'r5'].includes(t.card!))).toBe(true)
  })

  it('level 7 and up produces both kinds of extra task across seeds', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const hands = tihaOf(started(seed)).hands!
      generateTasks(8, hands, seeded(seed)).forEach((t) => t.kind !== 'win' && kinds.add(t.kind))
    }
    expect(kinds).toEqual(new Set(['count', 'last']))
  })
})

describe('tiha full games', () => {
  /** Plays a whole run with legal moves only: random cards, sometimes a true signal. */
  function playRun(seed: number) {
    const rng = seeded(seed)
    let p = startTiha(lobby(), rng)!
    let missions = 0
    for (let step = 0; step < 5000 && p.phase !== 'over'; step++) {
      const t = tihaOf(p)
      if (p.phase === 'draft') {
        const q = takeTask(p, t.turn!, tasksOf(p).find((x) => !x.owner)!.id)
        expect(q).toBeDefined()
        p = q!
      } else if (p.phase === 'play') {
        const uid = t.turn!
        const legal = playable(p, uid)
        expect(legal.length).toBeGreaterThan(0)
        if (rng() < 0.3) {
          const options = handOf(p, uid).flatMap((c) => marksFor(p, uid, c).map((m) => [c, m] as const))
          if (options.length) {
            const [c, m] = options[Math.floor(rng() * options.length)]
            const s = signal(p, uid, c, m)
            expect(s).toBeDefined()
            p = s!
          }
        }
        const card = legal[Math.floor(rng() * legal.length)]
        const q = playCard(p, uid, card)
        expect(q).toBeDefined()
        expect(playCard(q!, uid, card)).toBeUndefined()
        p = q!
        const tt = tihaOf(p)
        if (!tt.table?.length && p.phase === 'play') {
          expect(handOf(p, 'a')).toHaveLength(handOf(p, 'b').length)
          expect(handOf(p, 'a')).toHaveLength(HAND_SIZE - tt.tricks!)
        }
      } else if (p.phase === 'result') {
        missions++
        const r = tihaOf(p)
        expect(['won', 'lost']).toContain(r.outcome)
        if (r.outcome === 'lost') expect(r.failedTask).toBeDefined()
        p = nextTiha(p, rng)!
        expect(p).toBeDefined()
      }
    }
    return { p, missions }
  }

  it('50 random runs always end in over with legal moves only', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { p, missions } = playRun(seed)
      expect(p.phase).toBe('over')
      expect(tihaOf(p).lives).toBe(0)
      expect(missions).toBeGreaterThanOrEqual(3)
      expect(tihaOf(p).cleared).toBeLessThanOrEqual(missions - 3)
    }
  })

  it('double-applied moves return undefined', () => {
    const first = takeTask(started(3), 'a', 0)!
    expect(first.phase).toBe('play')
    expect(takeTask(first, 'a', 0)).toBeUndefined()
    const card = playable(first, 'a')[0]
    const lead = playCard(first, 'a', card)!
    expect(playCard(lead, 'a', card)).toBeUndefined()
    expect(startTiha(first, seeded(1))).toBeUndefined()
  })

  it('survives a Firebase round trip that drops empty containers and turns lists into objects', () => {
    const objectify = (v: unknown) => (Array.isArray(v) ? Object.fromEntries(v.map((x, i) => [i, x])) : v)
    const shape = (p: Pub): Pub => {
      const raw = JSON.parse(JSON.stringify(p), (_k, v) => (Array.isArray(v) && v.length === 0 ? undefined : v))
      const t = raw.tiha
      if (t) {
        for (const key of ['hidden', 'tasks', 'table']) if (t[key]) t[key] = objectify(t[key])
        for (const u of Object.keys(t.hands ?? {})) t.hands[u] = objectify(t.hands[u])
      }
      return raw
    }
    let p = shape(started(11))
    for (let guard = 0; guard < 600 && p.phase !== 'over'; guard++) {
      const t = tihaOf(p)
      let q: Pub | undefined
      if (p.phase === 'draft') q = takeTask(p, t.turn!, tasksOf(p).find((x) => !x.owner)!.id)
      else if (p.phase === 'play') {
        const uid = t.turn!
        const c = handOf(p, uid).find((x) => marksFor(p, uid, x).length)
        const s = c ? signal(p, uid, c, marksFor(p, uid, c)[0]) : undefined
        if (s) p = shape(s)
        q = playCard(p, uid, playable(p, uid)[0])
      } else q = nextTiha(p, seeded(guard + 1))
      expect(q).toBeDefined()
      p = shape(q!)
    }
    expect(p.phase).toBe('over')
  })
})
