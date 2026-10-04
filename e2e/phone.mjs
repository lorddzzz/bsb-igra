// Shared bits for the e2e scripts: the phone's screen size and a usability probe run on every screenshot.
//   WIDTH=375 HEIGHT=667 node e2e/kviz.mjs   plays on an iPhone SE sized screen
// The probe flags what a person would trip over: a page wider than the phone (sideways scrolling),
// text cut off inside its box, and buttons too small to hit with a thumb. Findings are printed at the end.
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/** The sandbox has Chromium at /opt/pw-browsers; elsewhere (CI) Playwright's own download is used. */
const SANDBOX_CHROME = '/opt/pw-browsers/chromium'
export const launchOptions = { executablePath: process.env.CHROME ?? (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : undefined) }

export const viewport = { width: Number(process.env.WIDTH ?? 390), height: Number(process.env.HEIGHT ?? 844) }
export const phoneContext = { viewport, deviceScaleFactor: 2, hasTouch: false }

/**
 * A phone-sized browser context with the game's real fonts. The page asks Google Fonts for Bangers and
 * Manrope; here they come from the @fontsource packages instead, so screens measure the same with or without
 * internet (a sandbox without it fell back to a narrower font and missed a header overflow CI then caught).
 */
export async function newPhoneContext(browser, extra = {}) {
  const ctx = await browser.newContext({ ...phoneContext, ...extra })
  await ctx.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: FONT_CSS }))
  await ctx.route('**/fonts.gstatic.com/local/**', (r) => {
    const file = FONT_FILES[new URL(r.request().url()).pathname.split('/').pop()]
    return file ? r.fulfill({ contentType: 'font/woff2', body: readFileSync(file) }) : r.abort()
  })
  return ctx
}

const require = createRequire(import.meta.url)
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+20A0-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'
const FONT_FILES = {}
let FONT_CSS = ''
for (const [family, pkg, weight] of [['Bangers', 'bangers', 400], ['Manrope', 'manrope', 400], ['Manrope', 'manrope', 600], ['Manrope', 'manrope', 800]])
  for (const subset of ['latin', 'latin-ext']) {
    const name = `${pkg}-${subset}-${weight}-normal.woff2`
    FONT_FILES[name] = require.resolve(`@fontsource/${pkg}/files/${name}`)
    FONT_CSS += `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;src:url(https://fonts.gstatic.com/local/${name}) format('woff2')${subset === 'latin-ext' ? `;unicode-range:${LATIN_EXT}` : ''}}\n`
  }

export const findings = new Map()

export async function probe(page, screen) {
  const found = await page
    .evaluate(() => {
      const out = []
      const W = document.documentElement.clientWidth
      if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px on a ${W}px screen)`)
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05
      }
      const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
      for (const el of document.querySelectorAll('main *, header *')) {
        if (!visible(el) || el.closest('[aria-hidden="true"], .bg, .fx')) continue
        const r = el.getBoundingClientRect()
        if (r.right > W + 1 && getComputedStyle(el).position !== 'fixed') out.push(`sticks out on the right: ${label(el)}`)
        const s = getComputedStyle(el)
        const clips = s.overflow === 'hidden' || s.textOverflow === 'ellipsis'
        if (clips && el.children.length === 0 && el.scrollWidth > el.clientWidth + 2) out.push(`text cut off: ${label(el)}`)
      }
      for (const el of document.querySelectorAll('button, [role=button], input, a')) {
        if (!visible(el) || el.disabled) continue
        const r = el.getBoundingClientRect()
        if (r.height < 32 || r.width < 32) out.push(`small tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${label(el)}`)
      }
      return [...new Set(out)]
    })
    .catch(() => [])
  for (const f of found) {
    if (!findings.has(f)) findings.set(f, new Set())
    findings.get(f).add(screen)
  }
}

export function report() {
  if (!findings.size) return console.log(`usability probe (${viewport.width}x${viewport.height}): nothing found`)
  console.log(`usability probe (${viewport.width}x${viewport.height}):`)
  for (const [f, screens] of findings) console.log(`  ${f}  [${[...screens].slice(0, 4).join(', ')}${screens.size > 4 ? ', …' : ''}]`)
}

/** Screenshot plus probe. */
export const shooter = (out) => async (page, name) => {
  await probe(page, name)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
}
