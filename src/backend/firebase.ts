import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  connectDatabaseEmulator,
  getDatabase,
  get,
  onDisconnect,
  onValue,
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

  return {
    uid,
    listen(path, cb, onError) {
      return onValue(ref(db, path), (snap) => cb(snap.val()), (err) => onError?.(err))
    },
    async get(path) {
      return (await get(ref(db, path))).val()
    },
    async set(path, value) {
      await set(ref(db, path), clean(value))
    },
    async update(path, patch) {
      await update(ref(db, path), clean(patch))
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
      onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val() !== true) return
        onDisconnect(r)
          .set(serverTimestamp())
          .then(() => set(r, true))
          .catch(() => {})
      })
    },
  }
}
