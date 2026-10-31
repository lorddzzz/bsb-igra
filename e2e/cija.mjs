// Plays a full game of "Čije je ovo?" with three simulated phones in local mode (MODE=emu for emulators) and saves screenshots.
// Usage: npx vite --port 5173 & node e2e/cija.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, report, shooter } from './phone.mjs'
import { createPhoneSession } from './session.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-cija'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const session = await createPhoneSession(browser, BASE)
const ctx = session
// PLAYERS=8 plays the biggest table; ROUNDS shortens the game.
const N = Number(process.env.PLAYERS ?? 3)
const names = [
  ['Dusan', 'Zmaj'],
  ['Marko', 'Vuk'],
  ['Luka', 'Soko'],
  ['Ana', 'Lisica'],
  ['Mila', 'Medved'],
  ['Sale', 'Sova'],
  ['Iva', 'Ris'],
  ['Jova', 'Jelen'],
].slice(0, N)
const answers = ['pica sa ananasom', 'pevam pod tušem', 'kišobran', 'nikad ne kasnim', 'ćevapi u ponoć']
const ROUNDS = Number(process.env.ROUNDS ?? 3)
const pages = []
const errors = []
const shot = shooter(OUT)

for (let i = 0; i < N; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`console ${i}: ${m.text()}`))
  pages.push(p)
}
const [host] = pages
await host.goto(session.url())
await session.resetLocal(host)
await host.getByRole('radio', { name: /ČIJE JE OVO/ }).click()
await shot(host, '01-home-cija')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick', { hasText: names[0][1] }).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < N; i++) {
  await pages[i].goto(session.url(code))
  await pages[i].getByPlaceholder('npr. Marko').fill(names[i][0])
  await pages[i].locator('.badge-pick', { hasText: names[i][1] }).click()
  await pages[i].getByRole('button', { name: /Uđi u sobu/ }).click()
}
await host.getByText(`Družina (${N})`).waitFor()
await session.verifyLobby(pages, code)
if ((await host.locator('.logo').textContent()) !== 'ČIJE JE OVO?') errors.push('header does not say ČIJE JE OVO?')
await shot(host, '02-lobby')

// only the host can change the settings
if ((await pages[1].locator('.segmented button:not([disabled])').count()) !== 0) errors.push('a guest can change the settings')
await host.locator('.segmented button', { hasText: 'Srednje' }).click()
await host.locator('.segmented.four button', { hasText: String(ROUNDS) }).click()
await host.locator('.segmented button.on', { hasText: 'Srednje' }).waitFor()
await shot(host, '03-lobby-settings')
await host.getByRole('button', { name: /Počni igru/ }).click()

for (let round = 1; round <= ROUNDS; round++) {
  await host.getByText(`PITANJE ${round} / ${ROUNDS}`).first().waitFor()
  for (let i = 0; i < N; i++) {
    const p = pages[i]
    await p.getByPlaceholder('Kratko i iskreno').waitFor()
    // two phones give the very same answer in round 2, to see the board tell them apart
    // some answers are as long as the limit allows, to see how the board copes
    const long = N > 3 && i === 1 ? 'ovo je veoma dug odgovor koji ide do samog kraja dozvoljenog' : ''
    const text = long || (round === 2 && i < 2 ? 'pica' : `${answers[(round + i) % answers.length]} ${i}`)
    await p.getByPlaceholder('Kratko i iskreno').fill(text)
    if (round === 1 && i === 0) await shot(p, '04-write')
    await p.getByRole('button', { name: /Pošalji odgovor/ }).click()
  }
  await host.locator('.match-card').first().waitFor()
  if (round === 2) {
    const texts = await host.locator('.match-text').allTextContents()
    if (new Set(texts).size !== texts.length) errors.push(`equal answers not told apart: ${texts.join(' | ')}`)
  }
  for (let i = 0; i < N; i++) {
    const p = pages[i]
    if ((await p.locator('.match-card.own').count()) !== 1) errors.push(`round ${round} page ${i}: no own answer marked`)
    const submit = p.getByRole('button', { name: /Zaključaj odgovore|za razvrstavanje/ })
    // the board starts on the first answer that is not yours
    const first = await p.locator('.match-card').evaluateAll((els) => els.findIndex((e) => !e.classList.contains('own')))
    const active = await p.locator('.match-card').evaluateAll((els) => els.findIndex((e) => e.classList.contains('active')))
    if (first !== active) errors.push(`round ${round} page ${i}: board starts on answer ${active}, expected ${first}`)
    if (round === 1 && i === 0) await shot(p, '05-match-empty')
    // tap friends one by one; the board moves on by itself and fills in the last answer
    for (let guard = 0; guard < N + 2 && (await submit.isDisabled()); guard++) {
      await p.locator('.roster-chip:not(.used):not([disabled])').first().click()
    }
    if (round === 1 && i === 0) await shot(p, '06-match-full')
    await p.getByRole('button', { name: /Zaključaj odgovore/ }).click()
  }
  await host.locator('.drumroll').waitFor()
  await host.locator('.answers .answer-card').nth(N - 1).waitFor({ timeout: 12000 })
  await host.waitForTimeout(N * 900 + 1000)
  if (round === 1 || round === ROUNDS) await shot(host, `07-reveal-r${round}`)
  if ((await host.locator('.answers .answer-card').count()) !== N) errors.push(`reveal does not show ${N} answers`)
  if (await pages[1].getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).count()) errors.push('non-host sees next')
  await host.getByRole('button', { name: /Sledeće pitanje|Proglasi/ }).click()
}
await host.locator('.winner').waitFor()
await shot(host, '08-game-over')
const scores = await host.locator('.standings li').allTextContents()
console.log('code', code, 'standings', scores)

// the finished game lands on the all-time scoreboard, reached from the home screen
await host.getByRole('button', { name: 'Izađi iz sobe' }).click()
await host.getByRole('button', { name: /Tabela svih vremena/ }).click()
await host.getByText('Šampioni').waitFor()
const rows = await host.locator('.tabela-list li').count()
if (rows !== scores.length) errors.push(`scoreboard shows ${rows} players, expected ${scores.length}`)
await host.getByRole('radio', { name: /ČIJE JE OVO/ }).click()
await shot(host, '09-tabela-cija')
await host.getByRole('button', { name: 'Nazad' }).click()
await host.getByRole('button', { name: 'Napravi sobu' }).waitFor()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
// fonts come from Google; a sandbox without internet can't load them, which is not the game's fault
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
