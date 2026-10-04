import { useEffect, useState } from 'react'

/** The build this page is running. */
export const BUILD_ID = __BUILD_ID__

/** How often an open app asks whether a new version is out. Coming back to the app also asks at once. */
const EVERY_MS = 2 * 60_000

/** The id of the build that is live right now, or null when the check fails (offline, server hiccup). */
export async function latestBuild(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetcher(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as { id?: unknown }
    return typeof body.id === 'string' ? body.id : null
  } catch {
    return null
  }
}

/**
 * True once a newer version is live than the one on this phone. Checks on start, whenever the app
 * comes back to the foreground (a home-screen app on iPhone resumes instead of reloading) and every
 * few minutes while open. Only on the built site: the dev server has no version.json.
 */
export function useUpdateAvailable(enabled = import.meta.env.PROD, fetcher: typeof fetch = fetch): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!enabled || ready) return
    let alive = true
    const check = async () => {
      if (document.visibilityState === 'hidden') return
      const id = await latestBuild(fetcher)
      if (alive && id && id !== BUILD_ID) setReady(true)
    }
    void check()
    const timer = setInterval(check, EVERY_MS)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.removeEventListener('online', check)
    }
  }, [enabled, ready, fetcher])
  return ready
}

/** Installs the service worker that lets the app open offline. Only on the built site. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* the app works without it */
    })
  })
}
