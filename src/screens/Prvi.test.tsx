// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { applyPrvi, scorePrvi } from '../prvi/logic'
import { MemoryDb } from '../test/memoryBackend'
import { simPrvi } from '../test/sims'
import { Prvi } from './Prvi'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const viewOf = (pub: Pub): RoomView => ({ pub, ticket: null, secret: null, online: {}, loading: false })

function mount(pub: Pub, uid: string) {
  const db = new MemoryDb()
  db.tree = { rooms: { TEST: { pub } } } as never
  const utils = render(
    <StrictMode>
      <Prvi be={db.phone(uid)} code="TEST" view={viewOf(pub)} />
    </StrictMode>,
  )
  return { db, ...utils }
}

const freshVote = () => simPrvi(3, 4).find((x) => x.pub.phase === 'vote' && !x.pub.prvi?.votes)!.pub

const tap = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
}

describe('the vote screen', () => {
  it('needs a pick before confirming, allows voting for yourself, and sends one vote', async () => {
    const pub = freshVote()
    const { db } = mount(pub, 'a')
    const confirm = () => screen.getByRole('button', { name: /Izaberi drugara|Glasam za/ })
    expect(confirm().hasAttribute('disabled')).toBe(true)
    await tap(screen.getByRole('button', { name: /Marko/ }))
    expect(confirm().textContent).toContain('Glasam za Marko')
    // changing your mind before confirming is fine; your own chip says "ti"
    await tap(screen.getByRole('button', { name: /Dusan/ }))
    expect(confirm().textContent).toContain('Glasam za sebe')
    await tap(confirm())
    expect(db.get('rooms/TEST/pub/prvi/votes/a')).toBe('a')
  })

  it('shows the vote as sent and locks the names once this phone has voted', () => {
    const pub = freshVote()
    mount({ ...pub, prvi: { ...pub.prvi, votes: { a: 'b' } } }, 'a')
    expect(screen.getByText('Tvoj glas je poslat')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Glasam za|Izaberi drugara/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Marko/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Luka/ }).hasAttribute('disabled')).toBe(true)
  })
})

describe('the reveal', () => {
  const reveal = (votes: Record<string, string>) => {
    const pub = freshVote()
    const p = { ...pub, prvi: { ...pub.prvi, votes } }
    return applyPrvi(p, scorePrvi(p))
  }

  it('comes after a drum roll and shows the title holder and who voted for whom', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = mount(reveal({ a: 'b', b: 'b', c: 'b', d: 'a' }), 'c')
    expect(container.querySelector('.drumroll')).not.toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(container.querySelector('.drumroll')).toBeNull()
    const rows = [...container.querySelectorAll('.prvi-tally li')].map((li) => li.textContent)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Marko')
    expect(rows[0]).toContain('3')
    expect(rows[0]).toContain('Dusan, Marko, ti')
    expect(container.querySelector('.prvi-scorers')?.textContent).toBe('+1 Dusan, Marko, ti')
  })

  it('says the group did not agree when every vote went to someone different', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = mount(reveal({ a: 'b', b: 'c', c: 'd', d: 'a' }), 'a')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Ekipa se ne slaže!')).toBeTruthy()
    expect(container.querySelector('.prvi-scorers')?.textContent).toBe('Niko ne dobija poen.')
  })
})

describe('the end of the game', () => {
  it('lists the titles each player took', () => {
    const over = simPrvi(5, 4).at(-1)!.pub
    const { container } = mount(over, 'a')
    expect(screen.getByText('Titule večeri')).toBeTruthy()
    const titles = Object.values(over.prvi?.titles ?? {}).flatMap((t) => Object.values(t))
    expect(titles.length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.prvi-titles li').length).toBe(Object.keys(over.prvi?.titles ?? {}).length)
  })
})
