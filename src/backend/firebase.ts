import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  connectDatabaseEmulator,
  getDatabase,
  get,
  endAt,
  limitToFirst,
  onDisconnect,
  onValue,
  orderByValue,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { clean, type Backend } from './types'

export async function createFirebaseBackend(
  options: FirebaseOptions,
  emulator?: { host: string },
): Promise<Backend> {
  const app = initializeApp(options)
  const auth = getAuth(app)
  const db = getDatabase(app)
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator.host}:9099`, { disableWarnings: true })
    connectDatabaseEmulator(db, emulator.host, 9000)
  }

  const uid = await new Promise<string>((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch((err) => {
      stop()
      reject(err)
    })
  })

  // Firebase measures how far this phone's clock is from the server's and keeps it updated.
  let offset = 0
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    offset = Number(snap.val()) || 0
  })

  return {
    uid,
    serverNow: () => Date.now() + offset,
    connection(cb) {
      return onValue(ref(db, '.info/connected'), (snap) => cb(snap.val() === true))
    },
    listen(path, cb, onError) {
      return onValue(ref(db, path), (snap) => cb(snap.val()), (err) => onError?.(err))
    },
    async get(path) {
      return (await get(ref(db, path))).val()
    },
    async keysAtOrBelow(path, cutoff, limit) {
      const snap = await get(query(ref(db, path), orderByValue(), endAt(cutoff), limitToFirst(limit)))
      const keys: string[] = []
      snap.forEach((child) => {
        if (typeof child.val() === 'number') keys.push(child.key!)
      })
      return keys
    },
    async set(path, value) {
      await set(ref(db, path), clean(value))
    },
    async update(path, patch) {
      // An empty path means the database root, which the SDK only accepts as a ref with no path.
      await update(path ? ref(db, path) : ref(db), clean(patch))
    },
    async transaction(path, fn) {
      const res = await runTransaction(ref(db, path), (cur) => {
        const next = fn(cur)
        return next === undefined ? undefined : clean(next)
      })
      return res.committed
    },
    presence(path) {
      const r = ref(db, path)
      let live = true
      const stop = onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val() !== true) return
        onDisconnect(r)
          .set(serverTimestamp())
          .then(async () => { if (live) await set(r, true) })
          .catch(() => {})
      })
      return (markOffline = true) => {
        live = false
        stop()
        if (markOffline) void set(r, serverTimestamp()).catch(() => {})
        else void onDisconnect(r).cancel().catch(() => {})
      }
    },
  }
}
