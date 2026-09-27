// Plays a full game with four simulated phones in local mode and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/play.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots'
const ROUNDS = Number(process.env.ROUNDS ?? 2)
// 'local' syncs tabs through localStorage (one shared browser context);
// 'emu' uses the Firebase emulators, so each phone gets its own context and login.
const MODE = process.env.MODE ?? 'local'
// NOTHUMBS=1 approves no missions, so some players score 0 in a round.
const NOTHUMBS = Boolean(process.env.NOTHUMBS)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true }
const shared = await browser.newContext(ctxOpts)
const names = [
  ['Dusan', 'Nick'],
  ['Marko', 'AJ'],
  ['Luka', 'Brian'],
  ['Ivan', 'Kevin'],
]
const pages = []
const errors = []
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

async function join(p, [name, badge]) {
  await p.getByPlaceholder('npr. Marko').fill(name)
  await p.locator('.badge-pick', { hasText: badge }).click()
  await p.getByRole('button', { name: /Uđi u sobu/ }).click()
}

for (let i = 0; i < 4; i++) {
  const p = await (MODE === 'local' ? shared : await browser.newContext(ctxOpts)).newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`console ${i}: ${m.text()}`))
  pages.push(p)
}
const [host] = pages
await host.goto(`${BASE}?${MODE}`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await shot(host, '01-home')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').waitFor()
await shot(host, '02-checkin')
await join(host, names[0])
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < 4; i++) {
  await pages[i].goto(`${BASE}?${MODE}&soba=${code}`)
  await join(pages[i], names[i])
}
await host.getByText('Putnici (4)').waitFor()
await shot(host, '03-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

async function findPage(text, timeout = 5000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    for (const p of pages) if (await p.getByText(text, { exact: false }).first().isVisible().catch(() => false)) return p
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`No page shows "${text}"`)
}

for (let round = 1; round <= ROUNDS; round++) {
  const picker = await findPage('Ti biraš kategoriju!')
  if (round === 1) await shot(picker, '04-category')
  await picker.locator('.category').first().click()
  await host.locator('.ticket').waitFor()
  if (round === 1) {
    await shot(host, '05-clues')
    const box = await host.locator('.ticket').boundingBox()
    await host.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await host.mouse.down()
    await host.waitForTimeout(500)
    await shot(host, '06-ticket-peek')
    await host.mouse.up()
    // also capture the impostor's ticket
    for (const p of pages) {
      const b = await p.locator('.ticket').boundingBox()
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
      await p.mouse.down()
      await p.waitForTimeout(450)
      const imp = await p.locator('.ticket-word.impostor').isVisible()
      if (imp) await shot(p, '07-ticket-impostor')
      await p.mouse.up()
    }
  }
  // only the host moves the game along
  if (await pages[1].getByRole('button', { name: /glasanje/ }).count()) errors.push('non-host sees the voting button')
  await host.getByRole('button', { name: /glasanje/ }).click()
  await host.getByText('Ko je uljez?').waitFor()
  // everyone votes for the next player in the list
  for (let i = 0; i < 4; i++) {
    await pages[i].locator('.vote').nth(round % 3 === 0 ? 1 : 0).click()
    // every other round, hedge with a second vote
    if (round % 2 === 0) await pages[i].locator('.vote').nth(2).click()
    await pages[i].getByRole('button', { name: /Potvrdi glas/ }).click()
    if (i === 0 && round === 1) await shot(host, '08-voting')
  }
  await host.locator('.drumroll').waitFor()
  if (round === 1) await shot(host, '09-drumroll')
  await host.locator('.reveal-card').first().waitFor({ timeout: 8000 })
  if (round === 1) await shot(host, '10-reveal')
  if (await pages[2].getByRole('button', { name: 'Dalje' }).count()) errors.push('non-host sees Dalje')
  await host.getByRole('button', { name: 'Dalje' }).click()
  // every caught impostor guesses (there can be two)
  for (let g = 0; g < 2; g++) {
    const guesser = await findPage('Koja je bila reč?', 1500).catch(() => null)
    if (!guesser) break
    await shot(guesser, `11-guess-r${round}-${g}`)
    await guesser.locator('.category').first().click()
    await guesser.getByText('Koja je bila reč?').waitFor({ state: 'hidden' })
  }
  const over = await findPage('pobed', 2500).catch(() => null)
  if (over) {
    await shot(host, '14-game-over')
    break
  }
  await host.getByText('Ova runda').waitFor()
  if (round === 1) await shot(host, '13-score')
  if (await pages[3].getByRole('button', { name: /Sledeća runda/ }).count()) errors.push('non-host sees next round')
  await host.getByRole('button', { name: /Sledeća runda/ }).click()
}

const scores = await host.locator('.standings li').allTextContents()
console.log('code', code, 'standings', scores)
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
