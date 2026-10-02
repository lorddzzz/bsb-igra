// Plays two games of Misija with eight simulated phones in local mode and saves screenshots.
// Game 1: all 5 special roles, spies play it safe, the crew wins 3 missions and the spies take their shot.
// Game 2: no special roles, spies sabotage every mission and win. Also checks a rejected team and the forced 5th proposal.
// Usage: npx vite --port 5173 & node e2e/misija.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, phoneContext, report, shooter } from './phone.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-misija'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const ctx = await browser.newContext(phoneContext)
const names = [
  ['Dusan', 'Nick'],
  ['Marko', 'AJ'],
  ['Luka', 'Brian'],
  ['Ana', 'Howie'],
  ['Jova', 'Kevin'],
  ['Mila', 'Mikrofon'],
  ['Sale', 'Gitara'],
  ['Iva', 'Zvezda'],
]
const pages = []
const errors = []
const shot = shooter(OUT)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (let i = 0; i < names.length; i++) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  pages.push(p)
}
const [host] = pages
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('radio', { name: /MISIJA/ }).click()
await shot(host, '01-home')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
const join = async (p, [name, badge]) => {
  await p.getByPlaceholder('npr. Marko').fill(name)
  await p.locator('.badge-pick', { hasText: badge }).click()
  await p.getByRole('button', { name: /Uđi u sobu/ }).click()
}
await host.locator('.badge-pick').nth(11).waitFor()
await shot(host, '02-checkin-12-badges')
await join(host, names[0])
const code = (await host.locator('.code-chip').textContent()).trim()
for (let i = 1; i < names.length; i++) {
  await pages[i].goto(`${BASE}?local&soba=${code}`)
  await join(pages[i], names[i])
}
await host.getByText(`Putnici (${names.length})`).waitFor()

async function findPage(text, timeout = 8000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    for (const p of pages) if (await p.getByText(text, { exact: false }).first().isVisible().catch(() => false)) return p
    await sleep(100)
  }
  throw new Error(`No page shows "${text}"`)
}

async function propose(n, size) {
  const leader = await findPage('Ti si vođa!')
  for (let i = 0; i < size; i++) await leader.locator('.badge-pick').nth((n + i) % names.length).click()
  return leader
}

async function voteAll(yes) {
  for (const p of pages) await p.getByRole('button', { name: yes ? /Za/ : /Protiv/ }).click()
}

async function playMission(sabotage) {
  await sleep(300)
  for (const p of pages) {
    const sab = p.getByRole('button', { name: /Sabotaža/ })
    if (!(await sab.isVisible().catch(() => false))) continue
    if (sabotage) {
      await sab.click()
      await sleep(150)
      if (await p.locator('.error', { hasText: 'ekipa uvek igra Uspeh' }).isVisible().catch(() => false))
        await p.getByRole('button', { name: /Uspeh/ }).click()
    } else await p.getByRole('button', { name: /Uspeh/ }).click()
  }
}

async function game(no, specials, sabotage) {
  await host.getByRole('radio', { name: String(specials) }).click()
  if (no === 1) await shot(host, '03-lobby')
  await host.getByRole('button', { name: /Počni igru/ }).click()
  // The narrator's opening. Without a Serbian or Croatian voice the host reads it from the screen with Dalje;
  // where the browser has one (CI's Chromium does), it is spoken and the start button comes at the end.
  await host.locator('.narrator-line').waitFor()
  if (no === 1) {
    await shot(host, '03b-narrator')
    await shot(pages[1], '03c-narrator-player')
    while (await host.getByRole('button', { name: /Dalje/ }).count()) await host.getByRole('button', { name: /Dalje/ }).click()
    await host.getByRole('button', { name: /Počni prvu misiju/ }).click({ timeout: 120000 })
  } else await host.getByRole('button', { name: 'Preskoči uvod' }).click()
  for (let mission = 1; mission <= 5; mission++) {
    await host.getByText(`MISIJA ${mission} / 5`).first().waitFor()
    const size = [3, 4, 4, 5, 5][mission - 1]
    if (no === 1 && mission === 1) {
      // one rejected proposal first
      const l = await propose(0, size)
      await shot(l, '04-leader-picks')
      await l.getByRole('button', { name: /Predloži tim/ }).click()
      await host.getByRole('button', { name: /Protiv/ }).waitFor()
      await shot(host, '05-vote')
      await voteAll(false)
      await host.getByText(/Prošli predlog.*odbijen/).waitFor()
      await shot(host, '06-rejected')
    }
    if (no === 2 && mission === 1) {
      for (let r = 0; r < 4; r++) {
        const l = await propose(r, size)
        await l.getByRole('button', { name: /Predloži tim/ }).click()
        await host.getByRole('button', { name: /Protiv/ }).waitFor()
        await voteAll(false)
        await host.getByText(`Odbijeno: ${r + 1}/5`).waitFor()
      }
      const l = await propose(4, size)
      await shot(l, '11-forced')
      await l.getByRole('button', { name: /Šalji tim na misiju/ }).click()
    } else {
      const l = await propose(mission, size)
      await l.getByRole('button', { name: /Predloži tim/ }).click()
      await host.getByRole('button', { name: /Za/ }).waitFor()
      await voteAll(true)
    }
    await host.getByText('TIM NA MISIJI').waitFor()
    if (no === 1 && mission === 1) {
      const member = await findPage('Tvoja tajna karta')
      await shot(member, '07-mission-card')
      // peek at the role card
      const card = member.locator('.role-card')
      const box = await card.boundingBox()
      await member.mouse.move(box.x + 50, box.y + 50)
      await member.mouse.down()
      await sleep(500)
      await shot(member, '08-role-peek')
      await member.mouse.up()
    }
    await playMission(sabotage)
    await host.locator('.verdict').waitFor({ timeout: 10000 }).catch(async (e) => {
      for (let i = 0; i < pages.length; i++) await shot(pages[i], `fail-${i}`)
      throw e
    })
    if (mission === 1) await shot(host, `09-reveal-g${no}`)
    if (await pages[1].getByRole('button', { name: /Sledeća misija|Kraj igre/ }).count()) errors.push('non-host sees next')
    const end = await host.getByRole('button', { name: /Kraj igre/ }).count()
    await host.getByRole('button', { name: /Sledeća misija|Kraj igre/ }).click()
    if (end) break
  }
  if (specials > 0 && !sabotage) {
    await host.getByText('ŠPIJUNI SE OTKRIVAJU').waitFor()
    const spy = await findPage('Ko je Menadžer?')
    await shot(spy, '10-guess')
    await spy.locator('.badge-pick').first().click()
    await spy.getByRole('button', { name: /To je/ }).click()
  }
  await host.locator('.winner').waitFor()
  await host.getByText('Uloge').waitFor()
  await sleep(300)
  await shot(host, `12-over-g${no}`)
  console.log(`game ${no}:`, (await host.locator('.winner-name').textContent()).trim(), '|', await host.locator('.tally').textContent())
}

await game(1, 5, false)
await host.getByRole('button', { name: 'Nova igra' }).click()
await game(2, 0, true)
if (!(await host.locator('.winner-name').textContent()).includes('ŠPIJUNI')) errors.push('spies should win game 2')
console.log('code', code)
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
// fonts come from Google; a sandbox without internet can't load them, which is not the game's fault
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
