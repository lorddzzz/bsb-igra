import assert from 'node:assert/strict'
import { newPhoneContext } from './phone.mjs'

/** Shared local database, or independent persisted emulator Auth sessions per phone. */
export async function createPhoneSession(browser, base) {
  const mode = process.env.MODE ?? 'local'
  assert.ok(['local', 'emu'].includes(mode), `Unsupported MODE: ${mode}`)
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'E2E needs a loopback app URL')
  assert.equal(new URL(base).search, '', 'BASE must not select a backend')
  const contexts = []
  const scripts = []
  let sharedContext
  async function context() {
    const ctx = await newPhoneContext(browser)
    await ctx.route(/https?:\/\/[^/]*(firebaseio\.com|firebasedatabase\.app|googleapis\.com)\//, route => {
      if (new URL(route.request().url()).hostname === 'fonts.googleapis.com') return route.fallback()
      throw new Error(`Blocked non-emulator Firebase request: ${route.request().url().split('?')[0]}`)
    })
    for (const script of scripts) await ctx.addInitScript(script)
    contexts.push(ctx)
    return ctx
  }
  async function auth(page) {
    if (mode === 'local') return { uid: await page.evaluate(() => sessionStorage.getItem('uljez-local-uid')) }
    let user
    for (let i = 0; i < 100 && !user; i++) {
      user = await page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
          const r = indexedDB.open('firebaseLocalStorageDb')
          r.onsuccess = () => resolve(r.result)
          r.onerror = () => reject(r.error)
        })
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return null }
        const values = await new Promise((resolve, reject) => {
          const r = db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll()
          r.onsuccess = () => resolve(r.result)
          r.onerror = () => reject(r.error)
        })
        db.close()
        const value = values.find(v => v.fbase_key.startsWith('firebase:authUser:'))?.value
        return value?.uid && value?.stsTokenManager?.accessToken ? { uid: value.uid, token: value.stsTokenManager.accessToken } : null
      })
      if (!user) await page.waitForTimeout(100)
    }
    assert.ok(user, 'Phone did not persist its emulator Auth user')
    return user
  }
  async function response(page, path) {
    const { token } = await auth(page)
    return fetch(`http://127.0.0.1:9000/${path}.json?ns=demo-uljez&auth=${encodeURIComponent(token)}`)
  }
  async function read(page, path) {
    if (mode === 'local') return page.evaluate(path => path.split('/').reduce((v, k) => v?.[k], JSON.parse(localStorage.getItem('uljez-local-db') ?? '{}')), path)
    const res = await response(page, path)
    assert.equal(res.status, 200, `Authenticated read failed: ${path}`)
    return res.json()
  }
  const session = {
    url(code) {
      const url = new URL(base)
      url.searchParams.set(mode, '')
      if (code) url.searchParams.set('soba', code)
      return url.href
    },
    async newPage() {
      const ctx = mode === 'local' ? await (sharedContext ??= context()) : await context()
      return ctx.newPage()
    },
    async addInitScript(script) {
      scripts.push(script)
      for (const ctx of contexts) await ctx.addInitScript(script)
    },
    async resetLocal(page) {
      if (mode === 'local') {
        await page.evaluate(() => localStorage.removeItem('uljez-local-db'))
        await page.reload()
      }
    },
    read,
    async ownTicket(page, code) { return read(page, `rooms/${code}/tickets/${(await auth(page)).uid}`) },
    async verifyLobby(pages, code) {
      const users = await Promise.all(pages.map(auth))
      assert.equal(new Set(users.map(u => u.uid)).size, pages.length, 'Phones must have distinct identities')
      await pages[1].reload()
      await pages[1].getByText(`Družina (${pages.length})`).waitFor()
      assert.equal((await auth(pages[1])).uid, users[1].uid, 'Refresh changed identity')
      if (mode === 'emu') {
        await pages[1].context().setOffline(true)
        await pages[1].getByText('Veza je prekinuta', { exact: true }).waitFor()
        if (process.argv[2]) await pages[1].screenshot({ path: `${process.argv[2]}/00-disconnected.png`, fullPage: true })
        await pages[1].context().setOffline(false)
        await pages[1].getByText('Veza je prekinuta', { exact: true }).waitFor({ state: 'hidden' })
        assert.equal((await auth(pages[1])).uid, users[1].uid, 'Reconnect changed identity')
      }
      const pub = await read(pages[1], `rooms/${code}/pub`)
      assert.equal(Object.keys(pub.players).length, pages.length, 'Refresh duplicated player')
      console.log(`${mode}: ${pages.length} distinct phones; refresh${mode === 'emu' ? ' and transport reconnect' : ''} retained identity`)
    },
    async verifyPrivacy(pages, code) {
      if (mode !== 'emu') return
      assert.ok(await session.ownTicket(pages[0], code), 'Own ticket must be readable')
      const other = (await auth(pages[1])).uid
      assert.equal((await response(pages[0], `rooms/${code}/tickets/${other}`)).status, 401, 'Other ticket must be denied')
      assert.equal((await response(pages[0], `rooms/${code}/secret`)).status, 401, 'Secret must be hidden before reveal')
      console.log('emu: own ticket readable; other ticket and hidden secret denied')
    },
  }
  return session
}
