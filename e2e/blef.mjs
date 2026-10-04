// Plays a full game of Blef with three simulated phones in local mode and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/blef.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, newPhoneContext, report, shooter } from './phone.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-blef'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const ctx = await newPhoneContext(browser)
const names = [
  ['Dusan', 'Zmaj'],
  ['Marko', 'Vuk'],
  ['Luka', 'Soko'],
]
const lies = ['papagaja', 'ananas', 'kišobran', 'crvene', 'Nemačke', 'pet', 'zeca', 'Mars']
const pages = []
const errors = []
const shot = shooter(OUT)

for (let i = 0; i < 3; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`console ${i}: ${m.text()}`))
  pages.push(p)
}
const [host] = pages
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('radio', { name: /BLEF/ }).click()
await shot(host, '01-home-blef')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick', { hasText: names[0][1] }).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < 3; i++) {
  await pages[i].goto(`${BASE}?local&soba=${code}`)
  await pages[i].getByPlaceholder('npr. Marko').fill(names[i][0])
  await pages[i].locator('.badge-pick', { hasText: names[i][1] }).click()
  await pages[i].getByRole('button', { name: /Uđi u sobu/ }).click()
}
await host.getByText('Družina (3)').waitFor()
if ((await host.locator('.logo').textContent()) !== 'BLEF') errors.push('header does not say BLEF')
await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

for (let round = 1; round <= 8; round++) {
  await host.getByText(`PITANJE ${round} / 8`).first().waitFor()
  for (let i = 0; i < 3; i++) {
    const p = pages[i]
    await p.getByPlaceholder('npr. papagaja').waitFor()
    await p.getByPlaceholder('npr. papagaja').fill(`${lies[(round + i) % lies.length]} ${i}`)
    if (round === 1 && i === 0) await shot(p, '03-write')
    await p.getByRole('button', { name: /Pošalji laž/ }).click()
  }
  await host.locator('.vote.answer').first().waitFor()
  if (round === 1) await shot(host, '04-pick')
  for (let i = 0; i < 3; i++) {
    const p = pages[i]
    const choices = p.locator('.vote.answer:not([disabled])')
    const n = await choices.count()
    if (n < 4) errors.push(`round ${round} page ${i}: only ${n} choices`)
    await choices.nth((round + i) % n).click()
    await p.getByRole('button', { name: /To je istina/ }).click()
  }
  await host.locator('.drumroll').waitFor()
  await host.locator('.answer-card.truth').waitFor({ timeout: 8000 })
  await host.waitForTimeout(5500)
  if (round === 1 || round === 8) await shot(host, `05-truth-r${round}`)
  if (await pages[1].getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).count()) errors.push('non-host sees next')
  await host.getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).click()
}
await host.locator('.winner').waitFor()
await shot(host, '06-game-over')
const scores = await host.locator('.standings li').allTextContents()
console.log('code', code, 'standings', scores)

// the finished game lands on the all-time scoreboard, reached from the home screen
await host.getByRole('button', { name: 'Izađi iz sobe' }).click()
await host.getByRole('button', { name: /Tabela svih vremena/ }).click()
await host.getByText('Šampioni').waitFor()
const rows = await host.locator('.tabela-list li').count()
if (rows !== scores.length) errors.push(`scoreboard shows ${rows} players, expected ${scores.length}`)
await shot(host, '07-tabela')
await host.getByRole('radio', { name: /BLEF/ }).click()
await shot(host, '08-tabela-blef')
await host.getByRole('button', { name: 'Nazad' }).click()
await host.getByRole('button', { name: 'Napravi sobu' }).waitFor()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
// fonts come from Google; a sandbox without internet can't load them, which is not the game's fault
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
