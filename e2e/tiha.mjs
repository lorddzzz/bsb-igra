// Plays Tiha misija with two simulated phones in local mode (MODE=emu for emulators) and saves screenshots.
// Random bot play loses its three lives quickly, so a run is short: draft, tricks, one signal, results, "over".
// A second short run reloads one phone in the middle of a mission and checks identity and hand survive.
// Usage: npx vite --port 5173 & node e2e/tiha.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, report, shooter } from './phone.mjs'
import { createPhoneSession } from './session.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-tiha'
const MAX_ACTIONS = 800
const MAX_IDLE = 400 // consecutive polls without anything to do, 100 ms each
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(launchOptions)
const session = await createPhoneSession(browser, BASE)
const names = [
  ['Dusan', 'Zmaj'],
  ['Marko', 'Vuk'],
]
const errors = []
const shot = shooter(OUT)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const pages = []
for (let i = 0; i < 2; i++) {
  const p = await session.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console ${i}: ${m.text()}`)
  })
  pages.push(p)
}
const [host, guest] = pages

/** Polls until fn() returns true; anything else it returns is shown if the wait runs out. */
async function until(fn, what, timeout = 30000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    last = await fn()
    if (last === true) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${what}: ${JSON.stringify(last)}`)
}
const fail = (msg) => {
  errors.push(msg)
  console.error('FAIL:', msg)
}

await host.goto(session.url())
await session.resetLocal(host)
await host.getByRole('radio', { name: /TIHA MISIJA/ }).click()
await shot(host, '01-home')
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await host.getByPlaceholder('npr. Marko').fill(names[0][0])
await host.locator('.badge-pick', { hasText: names[0][1] }).click()
await host.getByRole('button', { name: /Uđi u sobu/ }).click()
const code = (await host.locator('.code-chip').textContent()).trim()
await host.getByRole('button', { name: /Treba još 1 igrač/ }).waitFor()
await guest.goto(session.url(code))
await guest.getByPlaceholder('npr. Marko').fill(names[1][0])
await guest.locator('.badge-pick', { hasText: names[1][1] }).click()
await guest.getByRole('button', { name: /Uđi u sobu/ }).click()
await host.getByText('Družina (2)').waitFor()
if ((await host.locator('.logo').textContent()) !== 'TIHA MISIJA') fail('header does not say TIHA MISIJA')
await session.verifyLobby([host, guest], code)
await shot(host, '02-lobby')
await host.getByRole('button', { name: /Počni igru/ }).click()

const tiha = () => session.read(host, `rooms/${code}/pub/tiha`)
const pubRoom = () => session.read(host, `rooms/${code}/pub`)
const hostUid = (await pubRoom()).hostUid
const guestUid = Object.keys((await pubRoom()).players).find((u) => u !== hostUid)
const uids = [hostUid, guestUid]
const cardIds = (p) => p.locator('[data-testid^="card-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(5)))
const asArr = (v) => (Array.isArray(v) ? v : Object.values(v ?? {}))

/** The partner's cards must never be on your phone: every card shown is in your own hand. */
async function checkOwnCards() {
  const t = await tiha()
  for (const [i, p] of pages.entries()) {
    const shown = await cardIds(p)
    if (shown.length > 12) fail(`phone ${i} shows ${shown.length} cards`)
    const mine = asArr(t.hands?.[uids[i]])
    const theirs = asArr(t.hands?.[uids[1 - i]])
    const leaked = shown.filter((c) => theirs.includes(c) && !mine.includes(c))
    const foreign = shown.filter((c) => !mine.includes(c))
    if (leaked.length || foreign.length) fail(`phone ${i} shows cards that are not in its hand: ${foreign.join(',')}`)
  }
}

/** Once things are quiet: each phone shows exactly its hand, minus the lead card it has on the table. */
async function expectHandCounts() {
  await until(async () => {
    const t = await tiha()
    if (!t.hands || (await pubRoom()).phase !== 'play') return true
    const got = []
    for (const [i, p] of pages.entries()) {
      const onTable = asArr(t.table).some((x) => x.uid === uids[i]) ? 1 : 0
      const want = asArr(t.hands[uids[i]]).length - onTable
      const have = (await cardIds(p)).length
      got.push({ phone: i, have, want })
      if (have !== want) return got
    }
    return true
  }, 'each phone to show exactly its own hand')
}

let level = 1
let lives = 3
let signalDone = false
let signalTried = 0
let resultKey = ''
let runNo = 1
const shots = new Set()
const once = async (page, name) => {
  if (shots.has(name)) return
  shots.add(name)
  await shot(page, name)
}

async function livesLine(p) {
  return {
    label: await p.locator('.th-lives').getAttribute('aria-label'),
    hearts: (await p.locator('.th-lives').textContent()).split('❤️').length - 1,
  }
}

/** The signal flow on the phone whose turn it is: pick a card, pick a mark, the partner sees the line. */
async function doSignal(i) {
  const p = pages[i]
  const other = pages[1 - i]
  await p.getByTestId('signal').click()
  const cards = p.locator('[data-testid^="card-"]:enabled')
  await until(async () => (await p.getByTestId('signal-cancel').count()) > 0, 'signal mode')
  if (!(await cards.count())) {
    // only trumps left: nothing to show, so go back and try again on a later turn
    await p.getByTestId('signal-cancel').click()
    await until(async () => (await p.getByTestId('signal').count()) > 0, 'signal button back')
    signalTried++
    return false
  }
  await cards.first().click()
  const mark = p.locator('[data-testid^="mark-"]').first()
  await mark.waitFor()
  await once(p, '05-signal-pick')
  const label = (await mark.textContent()).trim()
  await mark.click()
  await until(async () => (await p.locator('[data-testid^="mark-"]').count()) === 0, 'signal mode to close')
  await until(async () => (await p.locator('.th-signal.mine').count()) === 1, 'own signal line')
  const line = other.locator('.th-signal:not(.mine)')
  await line.waitFor()
  const text = (await line.textContent()).replace(/\s+/g, ' ')
  if (!text.includes('pokazuje') || !text.includes(label)) fail(`partner's signal line "${text}" does not say "${label}"`)
  if ((await p.getByTestId('signal').count()) !== 0) fail('signal button still offered after the signal')
  const t = await tiha()
  if (!t.signals?.[uids[i]]) fail('signal was not stored')
  await once(other, '06-signal-partner')
  signalDone = true
  return true
}

/** One thing a phone can do right now. Returns what it did, or null when nobody has a move. */
async function step() {
  for (const p of pages) {
    const open = p.locator('[data-testid^="task-"]:enabled')
    if (await open.count()) {
      await once(p, '03-draft')
      await open.first().click()
      await until(async () => (await open.count()) === 0, 'task pick to land')
      return 'take'
    }
  }
  for (const [i, p] of pages.entries()) {
    const enabled = p.locator('[data-testid^="card-"]:enabled')
    if (!(await enabled.count())) continue
    await checkOwnCards()
    if (!signalDone && signalTried < 3 && (await p.getByTestId('signal').count())) {
      if (await doSignal(i)) return 'signal'
      continue
    }
    const all = p.locator('[data-testid^="card-"]')
    const before = await all.count()
    await enabled.first().click()
    await once(p, '04-play')
    await p.getByTestId('play').click()
    await until(async () => (await all.count()) < before, 'card to leave the hand')
    await expectHandCounts()
    return 'play'
  }
  for (const p of pages) {
    if (await p.getByTestId('rematch').count()) return 'over'
  }
  for (const p of pages) {
    if (!(await p.getByTestId('next').count())) continue
    const t = await tiha()
    const key = `${runNo}/${(await pubRoom()).round}`
    if (key !== resultKey) {
      resultKey = key
      const lost = t.outcome === 'lost'
      if (lost) lives--
      else level++
      for (const q of pages) {
        const line = await livesLine(q)
        if (line.label !== `Životi: ${lives} od 3` || line.hearts !== lives) fail(`hearts after ${t.outcome}: ${JSON.stringify(line)}, expected ${lives}`)
      }
      const banner = (await p.locator('.th-banner').textContent()).trim()
      if (!banner.includes(lost ? 'PROPALA' : 'USPELA')) fail(`banner "${banner}" does not match outcome ${t.outcome}`)
      if (lost && !(await p.locator('.th-minus').count())) fail('lost mission shows no life lost')
      if (lost !== ((await p.locator('.th-failed').count()) === 1)) fail('failed-task card does not match the outcome')
      if (asArr(t.hidden).length !== 7) fail('result does not show the 7 hidden cards')
      await once(p, lost ? '07-result-lost' : '07-result-won')
      console.log(`run ${runNo}: mission ${t.level} ${t.outcome}, lives ${lives}`)
    }
    await p.getByTestId('next').click()
    await until(async () => (await p.getByTestId('next').count()) === 0, 'next to land')
    return 'next'
  }
  return null
}

let actions = 0
let idle = 0
/** Calls step until stop(kind) is true. Both limits fail loudly. */
async function drive(stop, what) {
  for (;;) {
    const kind = await step()
    if (kind === null) {
      if (++idle > MAX_IDLE) throw new Error(`Nothing to do for ${MAX_IDLE} polls while waiting for ${what}`)
      await sleep(100)
      continue
    }
    idle = 0
    if (++actions > MAX_ACTIONS) throw new Error(`Step limit ${MAX_ACTIONS} hit while waiting for ${what}`)
    if (stop(kind)) return kind
  }
}

// Run 1: random legal play until the three lives are gone and the over screen is up.
await drive((k) => k === 'over', 'the over screen')
if (lives !== 0) fail(`ended with ${lives} lives left on our books`)
for (const [i, p] of pages.entries()) {
  const text = (await p.locator('.winner').textContent()).replace(/\s+/g, ' ')
  if (!text.includes('Stigli ste do misije')) fail(`phone ${i} over screen says "${text}"`)
  if (!text.includes(`Uspešnih misija: ${level - 1}`)) fail(`phone ${i} over screen "${text}" does not match ${level - 1} cleared`)
}
console.log('over:', (await host.locator('.winner').textContent()).replace(/\s+/g, ' '))
await shot(host, '08-over')
await shot(guest, '09-over-guest')
if (!(await host.getByRole('button', { name: 'Nazad u sobu' }).count())) fail('host has no "Nazad u sobu"')
if (await guest.getByRole('button', { name: 'Nazad u sobu' }).count()) fail('guest is offered "Nazad u sobu"')

// Run 2: rematch starts over at mission 1 with three hearts; reload a phone with a trick half played.
await guest.getByTestId('rematch').click()
await until(async () => (await host.locator('.th-level').count()) === 1, 'new run to start')
runNo++
level = 1
lives = 3
signalDone = true // the signal flow was covered in run 1
for (const [i, p] of pages.entries()) {
  const line = await livesLine(p)
  if (line.hearts !== 3 || !(await p.locator('.th-level').textContent()).includes('MISIJA 1')) fail(`phone ${i} after rematch: ${JSON.stringify(line)}`)
}
let plays = 0
while (plays < 3) {
  const kind = await drive(() => true, 'three cards in one mission')
  if (kind === 'play') plays++
  else if (kind === 'next') plays = 0
  else if (kind === 'over') {
    await guest.getByTestId('rematch').click()
    await until(async () => (await host.locator('.th-level').count()) === 1, 'new run to start')
    runNo++
    lives = 3
    plays = 0
  }
}
const snap = async (p) => ({
  cards: await cardIds(p),
  count: (await p.locator('.th-count b').textContent()).trim(),
  captain: (await p.locator('.th-captain').textContent()).replace(/\s+/g, ' '),
  myTurn: (await p.getByTestId('play').count()) === 1,
})
await expectHandCounts()
const before = await snap(host)
const beforeGuest = await snap(guest)
await shot(host, '10-before-reload')
await host.reload()
await until(async () => (await host.locator('[data-testid^="card-"]').count()) > 0, 'hand after reload')
const after = await snap(host)
if (JSON.stringify(after) !== JSON.stringify(before)) fail(`host after reload ${JSON.stringify(after)} differs from before ${JSON.stringify(before)}`)
if (JSON.stringify(await snap(guest)) !== JSON.stringify(beforeGuest)) fail('guest screen changed while the host reloaded')
await checkOwnCards()
await shot(host, '11-after-reload')
// and the game goes on from there
const next = await drive(() => true, 'a move after the reload')
console.log(`reload: identity and ${before.cards.length} cards kept, ${before.count}; game went on with "${next}"`)

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
// fonts come from Google; a sandbox without internet can't load them, which is not the game's fault
if (errors.length) process.exitCode = 1
report()
await browser.close()
