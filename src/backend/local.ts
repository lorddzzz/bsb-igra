import { clean, type Backend } from './types'

// A stand-in for Firebase that syncs browser tabs through localStorage.
// Used for local testing (open ?local in several tabs) before Firebase is configured.

const KEY = 'uljez-local-db'
type Tree = Record<string, unknown>

function load(): Tree {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function parts(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function read(tree: Tree, path: string): unknown {
  let cur: unknown = tree
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
  ps.slice(0, -1).forEach((p) => {
    const next = cur[p]
    cur[p] = next && typeof next === 'object' ? { ...(next as Tree) } : {}
    cur = cur[p] as Tree
  })
  const last = ps[ps.length - 1]
  if (value === null || value === undefined) delete cur[last]
  else cur[last] = value
  return root
}

export function createLocalBackend(): Backend {
  let uid = sessionStorage.getItem('uljez-local-uid')
  if (!uid) {
    uid = 'u' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('uljez-local-uid', uid)
  }
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) notify()
  })
  const commit = (tree: Tree) => {
    localStorage.setItem(KEY, JSON.stringify(tree))
    // storage events only reach other tabs, so tell this one directly
    setTimeout(notify, 0)
  }

  return {
    uid,
    listen(path, cb) {
      let last = '\u0000'
      const fire = () => {
        const v = read(load(), path)
        const s = JSON.stringify(v)
        if (s === last) return
        last = s
        cb(v === null ? null : JSON.parse(s))
      }
      listeners.add(fire)
      fire()
      return () => listeners.delete(fire)
    },
    async get(path) {
      return read(load(), path)
    },
    async set(path, value) {
      commit(write(load(), path, clean(value)))
    },
    async update(path, patch) {
      let tree = load()
      for (const [k, v] of Object.entries(clean(patch))) tree = write(tree, `${path}/${k}`, v)
      commit(tree)
    },
    async transaction(path, fn) {
      const tree = load()
      const next = fn(read(tree, path) as never)
      if (next === undefined) return false
      commit(write(tree, path, clean(next)))
      return true
    },
    presence(path) {
      void this.set(path, true)
    },
  }
}
