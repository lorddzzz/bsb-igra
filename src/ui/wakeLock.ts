// Keep the screen on while playing (Safari 16.4+). Quietly does nothing elsewhere.
let lock: WakeLockSentinel | null = null

export async function keepAwake() {
  try {
    if (!('wakeLock' in navigator) || lock) return
    lock = await navigator.wakeLock.request('screen')
    lock.addEventListener('release', () => (lock = null))
  } catch {
    lock = null
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void keepAwake()
})
