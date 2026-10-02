// Plays a full game of Talasna dužina with three simulated phones in local mode and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/wave.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, phoneContext, report, shooter } from './phone.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-wave'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const ctx = await browser.newContext(phoneContext)
const names = [
  ['Dusan', 'Nick'],
  ['Marko', 'AJ'],
  ['Luka', 'Brian'],
]
const clues = ['supa', 'ponedeljak', 'Larger Than Life', 'mačka', 'Beograd', 'karaoke']
const pages = []
const errors = []
const shot = shooter(OUT)

for (let i = 0; i < 3; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  pages.push(p)
}
const [host] = pages
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('radio', { name: /TALAS/ }).click()
await shot(host, '01-home')
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
await host.getByText('Putnici (3)').waitFor()
if ((await host.locator('.logo').textContent()) !== 'TALAS') errors.push('header does not say TALAS')
await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

async function findPage(text, timeout = 5000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    for (const p of pages) if (await p.getByText(text, { exact: false }).first().isVisible().catch(() => false)) return p
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`No page shows "${text}"`)
}

for (let round = 1; round <= 6; round++) {
  await host.getByText(`RUNDA ${round} / 6`).first().waitFor()
  const giver = await findPage('Ti daješ trag!')
  if (round === 1) await shot(giver, '03-choose-scale')
  await giver.locator('.scale-choice').first().click()
  await giver.getByPlaceholder('npr. supa').waitFor()
  if (round === 1) await shot(giver, '04-giver-target')
  await giver.getByPlaceholder('npr. supa').fill(clues[round - 1])
  await giver.getByRole('button', { name: /Pošalji trag/ }).click()
  let n = 0
  for (const p of pages) {
    if (p === giver) continue
    const dial = p.locator('.dial-svg.live')
    await dial.waitFor()
    const box = await dial.boundingBox()
    // drag the needle to a different spot per player and round
    const angle = Math.PI * (0.15 + 0.7 * (((round * 3 + n * 5) % 10) / 10))
    const cx = box.x + box.width / 2
    const cy = box.y + box.height * (160 / 180)
    await p.mouse.move(cx - 60, cy - 30)
    await p.mouse.down()
    await p.mouse.move(cx + Math.cos(angle) * 100, cy - Math.sin(angle) * 100, { steps: 5 })
    await p.mouse.up()
    if (round === 1 && n === 0) await shot(p, '05-aim')
    await p.getByRole('button', { name: /Zaključaj/ }).click()
    n++
  }
  await host.getByText('Ova runda').waitFor()
  if (round === 1 || round === 6) await shot(host, `06-result-r${round}`)
  if (await pages[1].getByRole('button', { name: /Sledeća runda|Proglasi/ }).count()) errors.push('non-host sees next')
  await host.getByRole('button', { name: /Sledeća runda|Proglasi/ }).click()
}
await host.locator('.winner').waitFor()
await shot(host, '07-game-over')
console.log('code', code, 'standings', await host.locator('.standings li').allTextContents())
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
// fonts come from Google; a sandbox without internet can't load them, which is not the game's fault
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
