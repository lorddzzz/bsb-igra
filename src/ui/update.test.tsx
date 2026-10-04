// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILD_ID, latestBuild, useUpdateAvailable } from './update'

const serving = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('version check', () => {
  it('reads the live build id and shrugs off failures', async () => {
    expect(await latestBuild(serving({ id: 'abc' }))).toBe('abc')
    expect(await latestBuild(serving({ id: 'abc' }, false))).toBeNull()
    expect(await latestBuild(serving({ nope: 1 }))).toBeNull()
    expect(await latestBuild((async () => { throw new Error('offline') }) as typeof fetch)).toBeNull()
  })

  it('never fetches the live file from the cache', async () => {
    const f = serving({ id: 'abc' })
    await latestBuild(f)
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toMatch(/^\.\/version\.json\?t=\d+$/)
    expect(init).toEqual({ cache: 'no-store' })
  })

  it('stays quiet while this phone runs the live build', async () => {
    const { result } = renderHook(() => useUpdateAvailable(true, serving({ id: BUILD_ID })))
    await act(async () => {})
    expect(result.current).toBe(false)
  })

  it('notices a new deploy when the app comes back to the foreground', async () => {
    let live = BUILD_ID
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ id: live }) }) as Response) as unknown as typeof fetch
    const { result } = renderHook(() => useUpdateAvailable(true, f))
    await act(async () => {})
    expect(result.current).toBe(false)
    live = 'newer'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(true)
  })

  it('also checks on a timer while the app stays open', async () => {
    vi.useFakeTimers()
    let live = BUILD_ID
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ id: live }) }) as Response) as unknown as typeof fetch
    const { result } = renderHook(() => useUpdateAvailable(true, f))
    await act(async () => {})
    live = 'newer'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })
    expect(result.current).toBe(true)
  })

  it('does nothing in dev and tests', async () => {
    const f = serving({ id: 'newer' })
    const { result } = renderHook(() => useUpdateAvailable(false, f))
    await act(async () => {})
    expect(result.current).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })
})
