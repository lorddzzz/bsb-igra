/**
 * What a value looks like after a round trip through Firebase Realtime Database:
 *  - undefined, null, empty lists and empty objects are not stored, so they come back missing
 *  - a list with a hole comes back as an object with numeric keys when it is sparse,
 *    and an object whose keys are all small numbers comes back as a list
 * Tests pass every state through this so a screen or rule that trips over a missing list fails here,
 * not on a phone at the concert.
 */
export function firebaseShape<T>(value: T): T {
  return (shape(JSON.parse(JSON.stringify(value ?? null))) ?? null) as T
}

function shape(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => [k, shape(v)] as const)
    .filter(([, v]) => v !== null && v !== undefined)
  if (!entries.length) return null
  // Firebase's rule: all keys are integers and at least half of the slots up to the largest are used.
  const numeric = entries.every(([k]) => /^(0|[1-9]\d*)$/.test(k))
  if (numeric) {
    const max = Math.max(...entries.map(([k]) => Number(k)))
    if (max < 2 * entries.length) {
      const list: unknown[] = Array(max + 1).fill(null)
      for (const [k, v] of entries) list[Number(k)] = v
      return list
    }
  }
  return Object.fromEntries(entries)
}
