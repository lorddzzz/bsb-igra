import type { Backend } from '../backend/types'
import { firebaseShape } from './firebaseShape'

type Tree = Record<string, unknown>

const parts = (path: string) => path.split('/').filter(Boolean)

function read(tree: unknown, path: string): unknown {
  let cur = tree
  for (const p of parts(path)) {
    if (cur === null || typeof cur !== 'object') return null
    cur = (cur as Tree)[p]
  }
  return cur ?? null
}

function write(tree: Tree, path: string, value: unknown): Tree {
  const ps = parts(path)
  if (!ps.length) return (value ?? {}) as Tree
  const root: Tree = { ...tree }
  let cur = root
  for (const p of ps.slice(0, -1)) {
    const next = cur[p]
    cur[p] = next && typeof next === 'object' ? { ...(next as Tree) } : {}
    cur = cur[p] as Tree
  }
  cur[ps[ps.length - 1]] = value
  return root
}

/**
 * One shared in-memory database that several simulated phones talk to, behaving like Firebase where
 * the game cares: values come back in Firebase's shape (empty lists gone), listeners fire after the
 * write resolves, and a transaction may first be tried against an empty cache (null), as the real
 * SDK does on a phone that has not loaded the path yet.
 */
export class MemoryDb {
  tree: Tree = {}
  clock = 1_000_000
  /** Call each transaction function with null first, like a cold Firebase cache. */
  coldTransactions = true
  writes = 0
  private listeners = new Set<() => void>()

  get(path: string): unknown {
    return firebaseShape(read(this.tree, path))
  }

  commit(path: string, value: unknown) {
    this.tree = (firebaseShape(write(this.tree, path, JSON.parse(JSON.stringify(value ?? null)))) ?? {}) as Tree
    this.writes++
    this.listeners.forEach((l) => l())
  }

  phone(uid: string): Backend {
    const db = this
    return {
      uid,
      serverNow: () => db.clock,
      listen(path, cb) {
        let last = '\u0000'
        const fire = () => {
          const v = db.get(path)
          const s = JSON.stringify(v)
          if (s === last) return
          last = s
          cb(v === null ? null : JSON.parse(s))
        }
        const l = () => queueMicrotask(fire)
        db.listeners.add(l)
        fire()
        return () => db.listeners.delete(l)
      },
      async get(path) {
        return db.get(path)
      },
      async set(path, value) {
        db.commit(path, value)
      },
      async update(path, patch) {
        for (const [k, v] of Object.entries(patch)) db.commit(`${path}/${k}`, v)
      },
      async transaction<T>(path: string, fn: (cur: T | null) => T | null | undefined) {
        const current = db.get(path) as T | null
        if (db.coldTransactions && current !== null) {
          // the SDK's first guess; Firebase throws away a null result that doesn't match the server
          const guess = fn(null)
          if (guess === undefined) return false
        }
        const next = fn(current === null ? null : (JSON.parse(JSON.stringify(current)) as T))
        if (next === undefined) return false
        if (next === null && current === null) return true
        db.commit(path, next)
        return true
      },
      presence(path) {
        db.commit(path, true)
      },
    }
  }
}
