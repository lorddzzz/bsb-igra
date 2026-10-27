import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * A game's code could not be downloaded. After a deploy the old files are gone from the server, so a phone that
 * stayed on the home screen across one asks for files that no longer exist; reloading gets the new version.
 */
export class ChunkLoadError extends Error {
  constructor(cause: unknown) {
    super('Igra se nije učitala.', { cause })
    this.name = 'ChunkLoadError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Runs a dynamic import, retrying once for a flaky connection, and reports a failure as ChunkLoadError. */
export async function loadChunk<M>(load: () => Promise<M>, retryMs = 600): Promise<M> {
  try {
    return await load()
  } catch {
    await sleep(retryMs)
    try {
      return await load()
    } catch (err) {
      throw new ChunkLoadError(err)
    }
  }
}

/** Lazy component from a named export of a dynamically imported module. */
export function lazyNamed<M, K extends keyof M, P extends object>(
  load: () => Promise<M>,
  name: K,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => loadChunk(load).then((m) => ({ default: m[name] as ComponentType<P> })))
}
