// Plays a full game of Kviz with four simulated phones in local mode and saves screenshots.
// Question 2 waits out the clock with one player not answering.
// Usage: npx vite --port 5173 & node e2e/kviz.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-kviz'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const names = [
  ['Dusan', 'Nick'],
  ['Marko', 'AJ'],
  ['Luka', 'Brian'],
  ['Jova', 'Kevin'],
]
const pages = []
const errors = []
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

for (let i = 0; i < names.length; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  pages.push(p)
}
const [host] = pages
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('radio', { name: /KVIZ/ }).click()
await shot(host, '01-home')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick', { hasText: names[0][1] }).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < names.length; i++) {
  await pages[i].goto(`${BASE}?local&soba=${code}`)
  await pages[i].getByPlaceholder('npr. Marko').fill(names[i][0])
  await pages[i].locator('.badge-pick', { hasText: names[i][1] }).click()
  await pages[i].getByRole('button', { name: /Uđi u sobu/ }).click()
}
await host.getByText(`Putnici (${names.length})`).waitFor()
if ((await host.locator('.logo').textContent()) !== 'KVIZ') errors.push('header does not say KVIZ')
await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()
await host.locator('.kv-lead').waitFor()
await shot(host, '03-lead')

const total = 15
let splashShot = false
let attacked = false
for (let round = 1; round <= total; round++) {
  await host.getByText(`PITANJE ${round} / ${total}`).first().waitFor()
  if (!splashShot && (await host.locator('.kv-splash').isVisible().catch(() => false))) {
    splashShot = true
    await shot(host, `10-special-r${round}`)
  }
  for (const p of pages) await p.locator('button.kv-option').first().waitFor({ timeout: 6000 })
  if (round === 1) await shot(pages[1], '04-question')
  const t0 = Date.now()
  // Somewhere after question 2, Dusan answers and then attacks Jova, who is still thinking.
  let victimWait = false
  if (!attacked && round >= 3 && !(await pages[3].locator('.kv-hit').count())) {
    await pages[0].locator('button.kv-option').nth(round % 4).click()
    const card = pages[0].locator('button.kv-card:not([disabled])').first()
    if (await card.count()) {
      await card.click()
      await shot(pages[0], '11-pick-victim')
      await pages[0].locator('.kv-victim', { hasText: 'Jova' }).click()
      await pages[3].locator('.kv-hit').waitFor({ timeout: 3000 })
      await new Promise((r) => setTimeout(r, 1200))
      await shot(pages[3], '12-attacked')
      attacked = true
      victimWait = true
    }
  }
  for (let i = 0; i < pages.length; i++) {
    if (round === 2 && i === 3) continue
    if (victimWait && i === 0) continue
    const pick = (round + i) % 4
    await pages[i].locator('button.kv-option').nth(pick).click()
    if (round === 1 && i === 0) await shot(host, '05-answered')
  }
  if (round === 2) {
    await pages[3].locator('.kv-timer.hurry').waitFor({ timeout: 12000 })
    await shot(pages[3], '06-hurry')
  }
  await host.locator('.kv-verdict').waitFor({ timeout: 15000 })
  const waited = Date.now() - t0
  if (round === 2 && waited < 8000) errors.push(`question 2 closed after ${waited} ms without everyone answering`)
  if (round !== 2 && !victimWait && waited > 9000) errors.push(`question ${round} took ${waited} ms although everyone answered`)
  if (round === 1) await shot(pages[1], '07-answer')
  if (round === 2) {
    await pages[3].locator('.kv-verdict').waitFor()
    await shot(pages[3], '08-too-late')
    if (!(await pages[3].getByText('Nisi stigao').count())) errors.push('late player not told they missed it')
  }
  // Every phone must agree on the options and the right answer.
  for (const p of pages) await p.locator('.kv-verdict').waitFor()
  const shown = await Promise.all(
    pages.map(async (p) => [
      ...(await p.locator('.kv-option > span:nth-child(2)').allTextContents()),
      await p.locator('.kv-option.right > span:nth-child(2)').textContent(),
    ]),
  )
  if (shown.some((s) => JSON.stringify(s) !== JSON.stringify(shown[0]))) errors.push(`round ${round}: phones show different options`)
}
await host.locator('.winner').waitFor({ timeout: 15000 })
await shot(host, '09-game-over')
if (await pages[1].getByRole('button', { name: 'Nova igra' }).count()) errors.push('non-host sees new game')
if (!attacked) errors.push('never managed to play an attack card')
if (!splashShot) errors.push('never saw a special round splash')
console.log('code', code, 'standings', await host.locator('.standings li').allTextContents())

// A second game in the same room must start its own clock and bring new questions.
await host.getByRole('button', { name: 'Nova igra' }).click()
await host.getByRole('button', { name: /Počni igru/ }).click()
await host.locator('.kv-lead').waitFor()
await host.locator('button.kv-option').first().waitFor({ timeout: 6000 })
console.log('second game started with a fresh lead-in')

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
