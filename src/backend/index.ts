import { firebaseConfig } from '../firebaseConfig'
import type { Backend } from './types'

export type { Backend }

const params = new URLSearchParams(location.search)

/** ?emu talks to the local Firebase emulators (for testing the database rules). */
const EMULATOR = params.has('emu')

export function useLocalBackend(): boolean {
  return !EMULATOR && (!firebaseConfig || params.has('local'))
}

export async function connect(): Promise<Backend> {
  if (useLocalBackend()) {
    const { createLocalBackend } = await import('./local')
    return createLocalBackend()
  }
  const { createFirebaseBackend } = await import('./firebase')
  if (EMULATOR)
    return createFirebaseBackend(
      { apiKey: 'demo', projectId: 'demo-uljez', databaseURL: 'http://127.0.0.1:9000?ns=demo-uljez' },
      { host: '127.0.0.1' },
    )
  return createFirebaseBackend(firebaseConfig!)
}
