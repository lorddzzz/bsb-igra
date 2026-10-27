import { describe, expect, it, vi } from 'vitest'
import { ChunkLoadError, loadChunk } from './lazyScreen'

describe('loadChunk', () => {
  it('returns the module on the first try', async () => {
    const load = vi.fn().mockResolvedValue({ ok: 1 })
    expect(await loadChunk(load, 0)).toEqual({ ok: 1 })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('retries once for a flaky connection', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({ ok: 2 })
    expect(await loadChunk(load, 0)).toEqual({ ok: 2 })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reports a ChunkLoadError when the file is gone, keeping the cause', async () => {
    const gone = new TypeError('Failed to fetch dynamically imported module')
    const load = vi.fn().mockRejectedValue(gone)
    const err = await loadChunk(load, 0).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ChunkLoadError)
    expect((err as ChunkLoadError).cause).toBe(gone)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
