/** The small slice of a realtime database the game needs. */
export interface Backend {
  readonly uid: string
  /** Calls back with the value now and on every change. Returns an unsubscribe function. */
  listen(path: string, cb: (value: unknown) => void, onError?: (err: Error) => void): () => void
  get(path: string): Promise<unknown>
  set(path: string, value: unknown): Promise<void>
  /** Multi-path update: keys are paths relative to `path`. A null value deletes. */
  update(path: string, patch: Record<string, unknown>): Promise<void>
  /** Atomic read-modify-write. Return undefined from `fn` to abort. Resolves true when committed. */
  transaction<T>(path: string, fn: (current: T | null) => T | null | undefined): Promise<boolean>
  /**
   * The database server's clock in ms, estimated on this phone. Phones' own clocks can be off by
   * seconds; this one is the same on every phone to within network jitter.
   */
  serverNow(): number
  /** Marks this player online, and offline again when the connection drops. */
  presence(path: string): void
}

/** Firebase rejects undefined values, so strip them (and empty containers stay as-is). */
export function clean<T>(value: T): T {
  return value === undefined ? (null as T) : JSON.parse(JSON.stringify(value))
}
