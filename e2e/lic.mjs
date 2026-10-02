// Plays a full Licitacija match with two simulated phones in local mode and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/lic.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-lic'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const names = [
  ['Dusan', 'Nick'],
  ['Marko', 'AJ'],
]
const pages = []
const errors = []
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

for (let i = 0; i < 3; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  pages.push(p)
}
const [host, guest, third] = pages
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('radio', { name: /LICITACIJA/ }).click()
await shot(host, '01-home')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick', { hasText: names[0][1] }).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
await host.getByRole('button', { name: /Treba još 1 igrač/ }).waitFor()
await guest.goto(`${BASE}?local&soba=${code}`)
await guest.getByPlaceholder('npr. Marko').fill(names[1][0])
await guest.locator('.badge-pick', { hasText: names[1][1] }).click()
await guest.getByRole('button', { name: /Uđi u sobu/ }).click()
await host.getByText('Putnici (2)').waitFor()
if ((await host.locator('.logo').textContent()) !== 'LICITACIJA') errors.push('header does not say LICITACIJA')

// a third phone must be turned away
await third.goto(`${BASE}?local&soba=${code}`)
await third.getByPlaceholder('npr. Marko').fill('Luka')
await third.locator('.badge-pick', { hasText: 'Brian' }).click()
await third.getByRole('button', { name: /Uđi u sobu/ }).click()
await third.getByText('Soba je puna.').waitFor()
await third.close()
pages.pop()

await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

// Dusan plays cards in order 1..13; Marko shifts by one in game 1 and plays the same in game 2 onwards
// for a few ties, then shifts the other way. Picks are fine as long as each card is used once.
async function playGame(game, strategy) {
  for (let round = 1; round <= 13; round++) {
    await host.getByText(`IGRA ${game} · RUNDA ${round} / 13`).first().waitFor()
    const [a, b] = strategy(round)
    for (const [p, card] of [
      [host, a],
      [guest, b],
    ]) {
      await p.locator('.lic-hand:not(.small) .lic-card', { hasText: new RegExp(`^${card}$`) }).click()
      if (game === 1 && round === 1 && p === host) await shot(host, '03-bid-pick')
      await p.getByRole('button', { name: /Licitiraj/ }).click()
      if (game === 1 && round === 1 && p === host) await shot(host, '04-bid-wait')
    }
    await host.getByRole('button', { name: /Sledeća runda|Kraj igre/ }).waitFor()
    if (game === 1 && round <= 3) {
      await host.waitForTimeout(800)
      await shot(host, `05-duel-r${round}`)
    }
    // either phone may continue; alternate
    await (round % 2 ? guest : host).getByRole('button', { name: /Sledeća runda|Kraj igre/ }).click()
  }
}

let game = 1
const strategies = [
  (r) => [r, (r % 13) + 1],
  (r) => [(r % 13) + 1, r],
  (r) => [r, r === 13 ? 1 : r + 1],
  (r) => [(r % 13) + 1, r],
]
for (let i = 0; i < 6; i++) {
  await playGame(game, strategies[i % strategies.length])
  await host.getByRole('button', { name: /Sledeća igra|Revanš/ }).waitFor()
  if (await host.locator('.crown').count()) break
  if (i === 0) await shot(host, '07-set-over')
  const text = await host.locator('.winner').textContent()
  if (!text.includes('Nerešeno')) game++
  await guest.getByRole('button', { name: /Sledeća igra/ }).click()
}
await host.locator('.crown').waitFor()
await host.waitForTimeout(800)
await shot(host, '08-match-over')
await shot(guest, '09-match-over-guest')
console.log('code', code, 'final', await host.locator('.winner').textContent())
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
