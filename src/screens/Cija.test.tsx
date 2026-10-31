// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { orderOf } from '../cija/logic'
import type { RoomView } from '../game/room'
import { playerOrder } from '../game/util'
import { MemoryDb } from '../test/memoryBackend'
import { simCija } from '../test/sims'
import { Cija } from './Cija'

afterEach(cleanup)

/** The first board nobody has guessed on yet, in a simulated 4 player game. */
function freshBoard() {
  const s = simCija(3, 4).find((x) => x.pub.phase === 'match' && !x.pub.cija?.guesses)!
  const db = new MemoryDb()
  db.tree = { rooms: { TEST: { pub: s.pub } } } as never
  const view: RoomView = { pub: s.pub, ticket: null, secret: null, online: {}, loading: false }
  return { s, db, view }
}

const tap = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
}

describe('the match-up board', () => {
  it('moves to the next answer by itself, fills in the last one, and sends a fair set of guesses', async () => {
    const { s, db, view } = freshBoard()
    render(<Cija be={db.phone('a')} code="TEST" view={view} />)
    const submit = () => screen.getByRole('button', { name: /Zaključaj odgovore|Još \d+ za razvrstavanje/ })
    expect(submit().hasAttribute('disabled')).toBe(true)

    // Say the right author for each answer in board order. The first two taps decide the board; the third is forced.
    const others = orderOf(s.pub).filter((o) => o !== 'a')
    for (const owner of others.slice(0, 2)) {
      const name = s.pub.players![owner].name
      await tap(screen.getByRole('button', { name: new RegExp(`${name}`) }))
    }
    expect(submit().textContent).toContain('Zaključaj odgovore')
    expect(submit().hasAttribute('disabled')).toBe(false)

    await tap(submit())
    expect(db.get('rooms/TEST/pub/cija/guesses/a')).toEqual(Object.fromEntries(others.map((o) => [o, o])))
  })

  it('lets a tapped friend move to another answer instead of being used twice', async () => {
    const { s, db, view } = freshBoard()
    const { container } = render(<Cija be={db.phone('a')} code="TEST" view={view} />)
    const others = orderOf(s.pub).filter((o) => o !== 'a')
    const name = (uid: string) => s.pub.players![uid].name
    // give the first answer to friend X, then jump back to the second answer and give it to X too
    await tap(screen.getByRole('button', { name: new RegExp(name(others[0])) }))
    const cards = [...container.querySelectorAll<HTMLElement>('.match-card')].filter((c) => !c.classList.contains('own'))
    await tap(cards[1])
    await tap(screen.getByRole('button', { name: new RegExp(name(others[0])) }))
    // X now sits on the second answer only, so the first is open again and the board is not complete
    expect(cards[0].querySelector('.badge')).toBeNull()
    expect(cards[1].querySelector('.badge')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Još \d+ za razvrstavanje/ })).toBeTruthy()
  })

  it('never lets you pick your own answer', async () => {
    const { s, db, view } = freshBoard()
    const { container } = render(<Cija be={db.phone('b')} code="TEST" view={view} />)
    const own = container.querySelector<HTMLButtonElement>('.match-card.own')!
    expect(own.disabled).toBe(true)
    expect(own.textContent).toContain(s.pub.cija!.answers!.b)
    expect(playerOrder(s.pub)).toHaveLength(4)
  })
})
