// Update detection and offline start on the production build, served by vite preview on :5173.
// Simulates a deploy by rebuilding while the phone has the app open.
import { execSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { launchOptions } from './phone.mjs'

const OUT = process.argv[2] ?? 'e2e/shots-pwa'
const URL = 'http://127.0.0.1:5173/?local'
const fail = (msg) => {
  console.error('FAIL', msg)
  process.exit(1)
}

const browser = await chromium.launch(launchOptions)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
await page.goto(URL)
await page.getByRole('button', { name: 'Napravi sobu' }).waitFor()
await page.evaluate(() => navigator.serviceWorker.ready)
const before = await page.locator('.version-note').textContent()
console.log('running', before)
if (!(await page.evaluate(() => fetch('./sw.js').then((r) => r.ok)))) fail('no sw.js')

// offline: the app still opens from the cache
await page.reload()
await page.evaluate(() => navigator.serviceWorker.ready)
await ctx.setOffline(true)
await page.reload()
await page.getByRole('button', { name: 'Napravi sobu' }).waitFor({ timeout: 5000 })
console.log('opens offline: ok')
await ctx.setOffline(false)

// a deploy lands while the phone sits in a room
await page.getByRole('button', { name: 'Napravi sobu' }).click()
await page.getByPlaceholder('npr. Marko').fill('Dusan')
await page.locator('.badge-pick').first().click()
await page.getByRole('button', { name: /Uđi u sobu/ }).click()
await page.getByText(/Družina \(1\)/).waitFor()
execSync('./node_modules/.bin/vite build', { stdio: 'ignore' })
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
await page.getByText('Stigla je nova verzija.').waitFor({ timeout: 5000 })
if (!(await page.getByText('Osveži posle partije, ostaješ u sobi.').isVisible())) fail('in-room wording')
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/01-room-update.png` })
console.log('banner in room: ok')

// refresh: same room, new version, banner gone
await page.getByRole('button', { name: 'Osveži sad' }).click()
await page.getByText(/Družina \(1\)/).waitFor()
await page.waitForTimeout(500)
if (await page.locator('.update-banner').count()) fail('banner still there after refresh')
console.log('refresh keeps the room: ok')

// home screen wording
await page.getByRole('button', { name: 'Izađi iz sobe' }).click()
const after = await page.locator('.version-note').textContent()
if (after === before) fail(`still on ${before}`)
console.log('now running', after)
execSync('./node_modules/.bin/vite build', { stdio: 'ignore' })
await page.evaluate(() => window.dispatchEvent(new Event('focus')))
await page.getByRole('button', { name: 'Osveži', exact: true }).waitFor({ timeout: 5000 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/02-home-update.png` })
console.log('banner on home: ok')
await browser.close()
