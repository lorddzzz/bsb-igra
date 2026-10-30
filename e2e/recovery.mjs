// Shared room recovery at phone size. Local or demo emulator mode; no live Firebase access.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { launchOptions, report, shooter } from './phone.mjs'
import { createPhoneSession } from './session.mjs'

const emulator = process.env.MODE === 'emu'
const out = process.argv[2] ?? 'e2e/shots-manual/recovery'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch(launchOptions)
try {
  const session = await createPhoneSession(browser, process.env.BASE ?? 'http://127.0.0.1:5173/')
  const pages = await Promise.all([0, 1, 2].map(() => session.newPage()))
  const [host, next] = pages
  const errors = []
  for (const page of pages) page.on('pageerror', (e) => errors.push(e.message))
  const shot = shooter(out)
  await host.goto(session.url())
  await host.getByRole('radio', { name: /BLEF/ }).click()
  await host.getByRole('button', { name: 'Napravi sobu' }).click()
  const code = (await host.locator('.code-chip').textContent()).trim()
  for (const [i, page] of pages.entries()) {
    if (i) await page.goto(session.url(code))
    await page.getByPlaceholder('npr. Marko').fill(['Ana', 'Bob', 'Ceca'][i])
    await page.locator('.badge-pick', { hasText: ['Vuk', 'Soko', 'Lisica'][i] }).click()
    await page.getByRole('button', { name: /Uđi u sobu/ }).click()
  }
  await session.verifyLobby(pages, code)
  await host.getByRole('button', { name: 'Izađi iz sobe' }).click()
  await next.getByText('Čekamo pojačanje').waitFor()
  assert.equal(await next.getByRole('button', { name: 'Preuzmi ulogu domaćina' }).count(), 0, 'Must allow time to reconnect')
  await shot(next, '01-waiting-for-host')
  await next.getByRole('button', { name: 'Preuzmi ulogu domaćina' }).waitFor({ timeout: 22_000 })
  await shot(next, '02-takeover-offered')
  await next.getByRole('button', { name: 'Preuzmi ulogu domaćina' }).click()
  await next.getByText('Ti si sada domaćin.').waitFor()
  const pub = await session.read(next, `rooms/${code}/pub`)
  assert.equal(Object.keys(pub.players).length, 3, 'Absent player must remain in the game')
  await shot(next, '03-new-host')
  await next.getByRole('button', { name: /Počni igru/ }).click()
  await next.getByPlaceholder('npr. papagaja').waitFor()
  await next.reload()
  await next.getByPlaceholder('npr. papagaja').waitFor()
  await shot(next, '04-rejoined-mid-round')
  await host.getByPlaceholder('ABCD').fill(code)
  await host.getByRole('button', { name: 'Uđi', exact: true }).click()
  await host.getByPlaceholder('npr. papagaja').waitFor()
  assert.equal(Object.keys((await session.read(next, `rooms/${code}/pub`)).players).length, 3)
  assert.deepEqual(errors, [])
  if (emulator) {
    // The rules must approve the actual UI transfer and the former host must rejoin as a player.
    report()
    console.log('Emulator recovery: host left, replacement committed, all players retained and former host rejoined')
  } else {
  // Simulate data written by a future build; this state has no creation path in the old build.
  await host.evaluate((code) => {
    const db = JSON.parse(localStorage.getItem('uljez-local-db'))
    db.rooms[code].pub.game = 'nova-igra'
    localStorage.setItem('uljez-local-db', JSON.stringify(db))
  }, code)
  await next.getByText('Ovoj sobi treba druga verzija').waitFor()
  assert.equal(await next.getByPlaceholder('npr. papagaja').count(), 0)
  assert.equal(await next.locator('.logo').textContent(), 'DRUŽINA')
  await shot(next, '05-incompatible-room')
  assert.equal(await next.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await next.getByRole('button', { name: 'Nazad' }).click()
  await next.getByRole('button', { name: 'Napravi sobu' }).waitFor()
  assert.deepEqual(errors, [])
  report()
  console.log('Recovery: grace period, explicit takeover, retained players, refresh/rejoin and incompatible-room guard passed')
  }
} finally {
  await browser.close()
}
