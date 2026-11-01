// Plays a full game of "Ko bi prvi?" with simulated phones in local mode (MODE=emu for emulators) and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/prvi.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, report, shooter } from './phone.mjs'
import { createPhoneSession } from './session.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-prvi'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const session = await createPhoneSession(browser, BASE)
// PLAYERS=12 plays the biggest table.
const N = Number(process.env.PLAYERS ?? 4)
const ROUNDS = 10
const names = [
  ['Dusan', 'Zmaj'],
  ['Marko', 'Vuk'],
  ['Luka', 'Soko'],
  ['Ana', 'Lisica'],
  ['Mila', 'Medved'],
  ['Sale', 'Sova'],
  ['Iva', 'Ris'],
  ['Jova', 'Jelen'],
  ['Neda', 'Kobra'],
  ['Pera', 'Ajkula'],
  ['Zika', 'Pantera'],
  ['Vesna', 'Feniks'],
].slice(0, N)
const pages = []
const errors = []
const shot = shooter(OUT)

for (let i = 0; i < N; i++) {
  const p = await session.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`console ${i}: ${m.text()}`))
  pages.push(p)
}
const [host] = pages
await host.goto(session.url())
await session.resetLocal(host)
await host.getByRole('radio', { name: /KO BI PRVI/ }).click()
await shot(host, '01-home-prvi')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick').nth(0).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < N; i++) {
  await pages[i].goto(session.url(code))
  await pages[i].getByPlaceholder('npr. Marko').fill(names[i][0])
  await pages[i].locator('.badge-pick:not([disabled])').first().click()
  await pages[i].getByRole('button', { name: /Uđi u sobu/ }).click()
}
await host.getByText(`Družina (${N})`).waitFor()
await session.verifyLobby(pages, code)
if ((await host.locator('.logo').textContent()) !== 'KO BI PRVI?') errors.push('header does not say KO BI PRVI?')
if ((await pages[1].locator('.segmented button:not([disabled])').count()) !== 0) errors.push('a guest can change the level')
await host.locator('.segmented button', { hasText: 'Srednje' }).click()
await host.locator('.segmented button.on', { hasText: 'Srednje' }).waitFor()
await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

/**
 * Who each phone votes for in a round: round 1 a clear majority for the host, round 2 everyone for a
 * different player (no points, no title), round 3 a tie when there are four or more, then a mix.
 */
function pickFor(round, i) {
  if (round === 1) return i === N - 1 ? 1 : 0
  if (round === 2) return (i + 1) % N
  if (round === 3 && N >= 4) return i < N - (N % 2) ? i % 2 : 2
  return (i * round) % 3 === 0 ? 2 : 1
}

for (let round = 1; round <= ROUNDS; round++) {
  await host.getByText(`PITANJE ${round} / ${ROUNDS}`).first().waitFor()
  for (let i = 0; i < N; i++) {
    const p = pages[i]
    const confirm = p.getByRole('button', { name: /Izaberi drugara|Glasam za/ })
    await confirm.waitFor()
    if (!(await confirm.isDisabled())) errors.push(`round ${round} page ${i}: can confirm before picking`)
    await p.locator('.prvi-roster .roster-chip').nth(pickFor(round, i)).click()
    if (round === 1 && i === 0) await shot(p, '03-vote-picked')
    await confirm.click()
    if (round === 1 && i === 0) {
      await p.getByText('Tvoj glas je poslat').waitFor()
      await shot(p, '04-vote-sent')
    }
  }
  await host.locator('.prvi-tally').waitFor({ timeout: 8000 })
  const disagree = (await host.getByText('Ekipa se ne slaže!').count()) > 0
  if (round === 2 && !disagree) errors.push('everyone voted for someone different, but there was a majority')
  if (round === 1 && disagree) errors.push('a clear majority was reported as a split')
  const holders = await host.locator('.prvi-holders > .player-tag').count()
  if (round === 3 && N >= 4 && holders !== 2) errors.push(`round 3: expected a shared title, got ${holders} holders`)
  if (round <= 3) await shot(host, `05-reveal-r${round}`)
  if (await pages[1].getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).count()) errors.push('a guest sees next')
  await host.getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).click()
}
await host.locator('.winner').waitFor()
await host.getByText('Titule večeri').waitFor()
await shot(host, '06-game-over')
const scores = await host.locator('.standings li').allTextContents()
console.log('code', code, 'standings', scores)

// refreshing a phone keeps its player and the finished game
await pages[1].reload()
await pages[1].locator('.winner').waitFor()

await host.getByRole('button', { name: 'Izađi iz sobe' }).click()
await host.getByRole('button', { name: /Tabela svih vremena/ }).click()
await host.getByText('Šampioni').waitFor()
const rows = await host.locator('.tabela-list li').count()
if (rows !== scores.length) errors.push(`scoreboard shows ${rows} players, expected ${scores.length}`)
await host.getByRole('radio', { name: /KO BI PRVI/ }).click()
await shot(host, '07-tabela-prvi')
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
