// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { asList } from '../game/util'
import { handOf, marksFor, partnerOf, playable, signal, suitOf, tableOf, tihaOf } from '../tiha/logic'
import type { TihaTask } from '../tiha/types'
import { MemoryDb } from '../test/memoryBackend'
import { simTiha } from '../test/sims'
import { Tiha } from './Tiha'

afterEach(cleanup)

const viewOf = (pub: Pub): RoomView => ({ pub, ticket: null, secret: null, online: {}, loading: false })

function mount(pub: Pub, uid: string) {
  const db = new MemoryDb()
  db.tree = { rooms: { TEST: { pub } } } as never
  const utils = render(<Tiha be={db.phone(uid)} code="TEST" view={viewOf(pub)} />)
  return { db, ...utils }
}

const tap = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
}

const snaps = simTiha(3)
const turnOf = (p: Pub) => tihaOf(p).turn!
/** A play state where the player on turn has not signalled and has a card with a mark. */
const canSignal = (p: Pub) => {
  const uid = turnOf(p)
  return handOf(p, uid).some((c) => marksFor(p, uid, c).length > 0)
}

describe('the play screen', () => {
  it('shows only my own cards, never the partner hand', () => {
    const pub = snaps.find((s) => s.pub.phase === 'play' && tihaOf(s.pub).tricks === 3)!.pub
    const me = turnOf(pub)
    const other = partnerOf(pub, me)!
    mount(pub, me)
    const buttons = [...document.querySelectorAll('.th-hand button')].map((b) => b.getAttribute('data-testid'))
    const table = tableOf(pub)
    const mineShown = handOf(pub, me).filter((c) => !table.some((p) => p.uid === me && p.card === c))
    expect(buttons.sort()).toEqual(mineShown.map((c) => `card-${c}`).sort())
    for (const c of handOf(pub, other)) expect(screen.queryByTestId(`card-${c}`)).toBeNull()
  })

  it('disables cards that do not follow the lead and plays the picked card only after Odigraj', async () => {
    const s = snaps.find((x) => {
      const p = x.pub
      if (p.phase !== 'play') return false
      const lead = tableOf(p)[0]
      if (!lead) return false
      const hand = handOf(p, turnOf(p))
      const follow = hand.filter((c) => suitOf(c) === suitOf(lead.card))
      return follow.length > 0 && follow.length < hand.length
    })!
    const pub = s.pub
    const me = turnOf(pub)
    const { db } = mount(pub, me)
    const ok = playable(pub, me)
    const hand = handOf(pub, me)
    for (const c of hand) expect((screen.getByTestId(`card-${c}`) as HTMLButtonElement).disabled, c).toBe(!ok.includes(c))
    expect((screen.getByTestId('play') as HTMLButtonElement).disabled).toBe(true)
    await tap(screen.getByTestId(`card-${ok[0]}`))
    expect(db.get('rooms/TEST/pub/tiha/table')).toHaveLength(1)
    await tap(screen.getByTestId('play'))
    expect(asList(db.get('rooms/TEST/pub/tiha/lastTrick/cards') as never)).toHaveLength(2)
  })

  it('waits when it is not my turn, with every card disabled', () => {
    const pub = snaps.find((s) => s.pub.phase === 'play')!.pub
    const me = partnerOf(pub, turnOf(pub))!
    mount(pub, me)
    expect(screen.getByText(/Čeka se/).textContent).toContain(pub.players![turnOf(pub)].name)
    for (const b of document.querySelectorAll('.th-hand button')) expect((b as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByTestId('signal')).toBeNull()
    expect(screen.queryByTestId('play')).toBeNull()
  })

  it('signals through signal mode, then hides the Signal button and keeps the signal line', async () => {
    const s = snaps.find((x) => x.pub.phase === 'play' && !tihaOf(x.pub).signals?.[turnOf(x.pub)] && canSignal(x.pub))!
    const me = turnOf(s.pub)
    const { db } = mount(s.pub, me)
    await tap(screen.getByTestId('signal'))
    const card = handOf(s.pub, me).find((c) => marksFor(s.pub, me, c).length)!
    const noMark = handOf(s.pub, me).find((c) => !marksFor(s.pub, me, c).length)
    if (noMark) expect((screen.getByTestId(`card-${noMark}`) as HTMLButtonElement).disabled).toBe(true)
    await tap(screen.getByTestId(`card-${card}`))
    const mark = marksFor(s.pub, me, card)[0]
    await tap(screen.getByTestId(`mark-${mark}`))
    expect(db.get(`rooms/TEST/pub/tiha/signals/${me}/card`)).toBe(card)
  })

  it('has no Signal button after I signalled, and shows my signal line', () => {
    const base = snaps.find((x) => x.pub.phase === 'play' && canSignal(x.pub))!.pub
    const me = turnOf(base)
    const card = handOf(base, me).find((c) => marksFor(base, me, c).length)!
    const pub = signal(base, me, card, marksFor(base, me, card)[0])!
    mount(pub, me)
    expect(screen.queryByTestId('signal')).toBeNull()
    expect(screen.getByText('Tvoj signal:')).toBeTruthy()
  })

  it('shows the partner signal to the other phone', () => {
    const base = snaps.find((x) => x.pub.phase === 'play' && canSignal(x.pub))!.pub
    const me = turnOf(base)
    const card = handOf(base, me).find((c) => marksFor(base, me, c).length)!
    const pub = signal(base, me, card, marksFor(base, me, card)[0])!
    mount(pub, partnerOf(pub, me)!)
    expect(screen.getByText(/pokazuje:/).textContent).toContain(pub.players![me].name)
  })
})

describe('the result screen', () => {
  it('shows the seven hidden cards, both remaining hands and one button to go on', () => {
    const pub = snaps.find((s) => s.pub.phase === 'result' && (tihaOf(s.pub).lives ?? 0) > 0)!.pub
    mount(pub, 'a')
    const hidden = screen.getByText('Karte van igre').closest('.card') as HTMLElement
    expect(within(hidden).getAllByRole('img')).toHaveLength(7)
    expect(screen.getByText('Šta je ostalo u rukama')).toBeTruthy()
    expect(screen.getByTestId('next').textContent).toBe('Sledeća misija')
    expect(screen.getByText(tihaOf(pub).outcome === 'won' ? 'MISIJA USPELA!' : 'MISIJA PROPALA!')).toBeTruthy()
  })

  it('says Kraj akcije when no lives are left, and shows the failed task with -1 život', () => {
    const pub = snaps.find((s) => s.pub.phase === 'result' && tihaOf(s.pub).lives === 0)!.pub
    mount(pub, 'b')
    expect(screen.getByTestId('next').textContent).toBe('Kraj akcije')
    expect(screen.getByText('−1 život')).toBeTruthy()
    expect(screen.getByText('PROPAO ZADATAK')).toBeTruthy()
  })
})

describe('the draft screen', () => {
  const draft = snaps.find((s) => s.pub.phase === 'draft')!.pub
  const withTasks = (tasks: TihaTask[]): Pub => ({ ...draft, tiha: { ...tihaOf(draft), tasks } })

  it('uses the right Serbian plural for tricks and the zero form', () => {
    const tasks: TihaTask[] = [0, 1, 2, 4, 5].map((n, id) => ({ id, kind: 'count', n }))
    const me = turnOf(draft)
    mount(withTasks(tasks), me)
    expect(screen.getByText('Ne osvoji nijedan štih')).toBeTruthy()
    expect(screen.getByText('Osvoji tačno 1 štih')).toBeTruthy()
    expect(screen.getByText('Osvoji tačno 2 štiha')).toBeTruthy()
    expect(screen.getByText('Osvoji tačno 4 štiha')).toBeTruthy()
    expect(screen.getByText('Osvoji tačno 5 štihova')).toBeTruthy()
  })

  it('lets the picker take an open task, and waits for the partner otherwise', async () => {
    const me = turnOf(draft)
    const { db } = mount(draft, me)
    await tap(screen.getByTestId('task-0'))
    expect(db.get('rooms/TEST/pub/tiha/tasks/0/owner')).toBe(me)
    cleanup()
    mount(draft, partnerOf(draft, me)!)
    expect(screen.getByText(/bira zadatak/).textContent).toContain(draft.players![me].name)
    expect((screen.getByTestId('task-0') as HTMLButtonElement).disabled).toBe(true)
  })
})
