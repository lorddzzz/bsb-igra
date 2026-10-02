// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { firebaseShape } from '../test/firebaseShape'
import { createLocalBackend } from './local'
import { clean } from './types'

const tick = () => new Promise((r) => setTimeout(r, 5))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('local test backend', () => {
  it('keeps one uid per tab', () => {
    expect(createLocalBackend().uid).toBe(createLocalBackend().uid)
    sessionStorage.clear()
    const other = createLocalBackend().uid
    expect(other).toMatch(/^u[a-z0-9]+$/)
  })

  it('drops empty lists and objects like Firebase, so local tests catch missing-list crashes', async () => {
    const be = createLocalBackend()
    await be.set('rooms/ABCD/pub', { a: [], b: {}, c: [1], d: { e: [] }, f: 0, g: false, h: '' })
    expect(await be.get('rooms/ABCD/pub')).toEqual({ c: [1], f: 0, g: false, h: '' })
  })

  it('deletes on null and on undefined', async () => {
    const be = createLocalBackend()
    await be.set('x/y', 1)
    await be.update('x', { y: null, z: 2 })
    expect(await be.get('x')).toEqual({ z: 2 })
    await be.set('x', undefined)
    expect(await be.get('x')).toBeNull()
  })

  it('aborts a transaction that returns undefined and commits otherwise', async () => {
    const be = createLocalBackend()
    await be.set('n', 1)
    expect(await be.transaction<number>('n', () => undefined)).toBe(false)
    expect(await be.transaction<number>('n', (v) => (v ?? 0) + 1)).toBe(true)
    expect(await be.get('n')).toBe(2)
  })

  it('tells listeners about changes once, and stops when asked', async () => {
    const be = createLocalBackend()
    const seen: unknown[] = []
    const stop = be.listen('room', (v) => seen.push(v))
    await be.set('room/a', 1)
    await tick()
    await be.set('room/a', 1) // same value, no new call
    await tick()
    stop()
    await be.set('room/a', 2)
    await tick()
    expect(seen).toEqual([null, { a: 1 }])
  })

  it('survives a corrupt store', async () => {
    localStorage.setItem('uljez-local-db', '{not json')
    const be = createLocalBackend()
    expect(await be.get('anything')).toBeNull()
  })
})

describe('clean', () => {
  it('strips undefined fields before they reach Firebase, which would reject them', () => {
    expect(clean({ a: undefined, b: 1, c: [undefined, 2] })).toEqual({ b: 1, c: [null, 2] })
    expect(clean(undefined)).toBeNull()
  })
})

describe('firebaseShape (the test helper itself)', () => {
  it('matches what Firebase hands back', () => {
    expect(firebaseShape({ a: [], b: { c: null }, d: [1, 2] })).toEqual({ d: [1, 2] })
    // numeric keys come back as a list when dense enough, else stay an object
    expect(firebaseShape({ 0: 'x', 1: 'y' })).toEqual(['x', 'y'])
    expect(firebaseShape({ 0: 'x', 5: 'y' })).toEqual({ 0: 'x', 5: 'y' })
    expect(firebaseShape([null, 'a', 'b'])).toEqual([null, 'a', 'b'])
    expect(firebaseShape({ m1: true })).toEqual({ m1: true })
    expect(firebaseShape([])).toBeNull()
  })
})
