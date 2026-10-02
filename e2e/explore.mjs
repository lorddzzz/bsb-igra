// Exploratory checks of the things friends do that the happy-path scripts don't:
// refreshing mid-game, leaving and coming back, a latecomer, long and emoji names, double taps.
// Usage: npx vite --port 5173 & node e2e/explore.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { launchOptions, newPhoneContext, report, shooter } from './phone.mjs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/'
const OUT = process.argv[2] ?? 'e2e/shots-explore'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch(launchOptions)
const ctx = await newPhoneContext(browser)
const shot = shooter(OUT)
const errors = []
const checks = []
const check = (ok, what) => {
  checks.push(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) process.exitCode = 1
}
const newPhone = async (i) => {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`page ${i}: ${e.message}`))
  return p
}
const appears = (locator, timeout = 8000) => locator.waitFor({ timeout }).then(() => true, () => false)
const visible = (p, text) => p.getByText(text, { exact: false }).first().isVisible().catch(() => false)
async function waitText(p, text, timeout = 5000) {
  await p.getByText(text, { exact: false }).first().waitFor({ timeout }).catch(() => {})
  return visible(p, text)
}
async function join(p, name, badge) {
  await p.getByPlaceholder('npr. Marko').fill(name)
  await p.locator('.badge-pick', { hasText: badge }).click()
  await p.getByRole('button', { name: /Uđi u sobu/ }).click()
}

const host = await newPhone(0)
await host.goto(`${BASE}?local`)
await host.evaluate(() => localStorage.clear())
await host.reload()
await host.getByRole('button', { name: 'Napravi sobu' }).click()
await join(host, 'Aleksandra Marić', 'Nick') // 16 characters
const code = (await host.locator('.code-chip').textContent()).trim()
const b = await newPhone(1)
await b.goto(`${BASE}?local&soba=${code}`)
await join(b, '🎸🎸 Đorđe', 'AJ')
const c = await newPhone(2)
await c.goto(`${BASE}?local&soba=${code}`)
// the badge someone else took is greyed out
check(await c.locator('.badge-pick', { hasText: 'AJ' }).isDisabled(), 'a taken badge cannot be picked')
await join(c, 'Ž', 'Brian')
await host.getByText('Putnici (3)').waitFor()
await shot(host, '01-lobby-long-names')

// lowercase code typed by hand
const d = await newPhone(3)
// in ?local mode all tabs share one storage, so this tab would follow the others into their room
await d.addInitScript(() => localStorage.removeItem('uljez-room'))
await d.goto(`${BASE}?local`)
await d.locator('.code-input').fill(code.toLowerCase())
check((await d.locator('.code-input').inputValue()) === code, 'room code input upper-cases what you type')
await d.locator('.code-input').fill('QQQQ')
await d.getByRole('button', { name: 'Uđi' }).click()
check(await waitText(d, 'ne postoji'), 'a wrong code says the room does not exist')
await d.evaluate((c) => localStorage.setItem('uljez-room', c), code)

await host.getByRole('button', { name: /Počni igru/ }).click()
await host.waitForTimeout(300)

// a latecomer opens the link after the start
await d.goto(`${BASE}?local&soba=${code}`)
if (await d.getByPlaceholder('npr. Marko').waitFor({ timeout: 5000 }).then(() => true, () => false)) {
  await join(d, 'Kasni', 'Kevin')
  check(await waitText(d, 'već počela'), 'a latecomer is told the game already started')
  await shot(d, '02-latecomer')
} else check(false, 'a latecomer sees the check-in screen')

// whoever picks the category picks
const phones = [host, b, c]
let picker
for (let i = 0; i < 30 && !picker; i++) {
  for (const p of phones) if (await visible(p, 'Ti biraš kategoriju!')) picker = p
  await host.waitForTimeout(100)
}
await picker.locator('.category').first().click()
await host.locator('.ticket').waitFor()

// refresh mid-round: back in the same room, same round, ticket still there
await b.reload()
check(await appears(b.locator('.ticket')), 'refreshing mid-round comes back to the round, ticket and all')
await shot(b, '03-after-refresh')

await host.getByRole('button', { name: /glasanje/ }).click()
await host.getByText('Ko je uljez?').waitFor()

// leave with the eject button and come back with the code
await c.getByRole('button', { name: 'Izađi iz sobe' }).click()
check(await waitText(c, 'Napravi sobu'), 'eject goes back to the home screen')
await c.locator('.code-input').fill(code)
await c.getByRole('button', { name: 'Uđi' }).click()
check(await waitText(c, 'Ko je uljez?'), 'coming back with the code lands on the vote, no new check-in')
await shot(c, '04-back-after-leaving')

// everyone votes; the host double-taps confirm
for (const [p, n] of [[host, 1], [b, 0], [c, 0]]) {
  await p.locator('.vote').nth(n).click()
  const btn = p.getByRole('button', { name: /Potvrdi glas/ })
  // a quick double tap: the second tap lands on whatever replaced the button
  const box = await btn.boundingBox()
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2, delay: 30 })
}
check(await appears(host.locator('.drumroll, .reveal-card').first()), 'the vote closes after the last confirm')

// refresh during the reveal: the round's answer can still be read
await host.locator('.reveal-card').first().waitFor({ timeout: 8000 }).catch(() => {})
await b.reload()
check(await appears(b.locator('.reveal-card').first()), 'refreshing on the reveal shows the reveal again')
await shot(b, '05-reveal-after-refresh')

console.log(checks.join('\n'))
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
if (errors.some((e) => !e.includes('Failed to load resource'))) process.exitCode = 1
report()
await browser.close()
