import { describe, expect, it } from 'vitest'
import { normalizeAnswer, isTruth } from '../blef/logic'
import { CARDS, SPECIALS } from '../kviz/cards'
import { ROLES } from '../misija/logic'
import { BLEF_QUESTIONS, BLANK } from './blefQuestions'
import { KVIZ_QUESTIONS, KVIZ_TOPICS, TOPIC_LABELS } from './kvizQuestions'
import { WAVE_SCALES } from './waveScales'
import { CATEGORIES } from './words'
import { ALL_BADGES } from '../game/types'

// Content checks: everything players read is Serbian in Latin script, ids are unique and every
// question can actually be answered. A typo here would only show up mid-game on a phone.

const CYRILLIC = /[Ѐ-ӿ]/
/** Typed with the wrong keyboard: c/s/z with a caron or acute that Serbian Latin doesn't use. */
const NOT_SERBIAN = /[ĉŝẑçśźñ]/i

function allText(): string[] {
  return [
    ...CATEGORIES.flatMap((c) => [c.name, ...c.words]),
    ...KVIZ_QUESTIONS.flatMap((q) => [q.q, q.a, ...q.w]),
    ...BLEF_QUESTIONS.flatMap((q) => [q.q, q.a, ...(q.alt ?? []), ...q.fakes]),
    ...WAVE_SCALES.flatMap((s) => [s.left, s.right]),
    ...CARDS.flatMap((c) => [c.name, c.effect]),
    ...Object.values(SPECIALS).flatMap((s) => [s.name, s.text]),
    ...Object.values(ROLES).flatMap((r) => [r.name, r.text]),
    ...Object.values(TOPIC_LABELS),
  ]
}

const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)

describe('all content', () => {
  it('is in Latin script, with no stray whitespace', () => {
    for (const t of allText()) {
      expect(t, t).not.toMatch(CYRILLIC)
      expect(t, t).not.toMatch(NOT_SERBIAN)
      expect(t, JSON.stringify(t)).toBe(t.trim())
      expect(t, JSON.stringify(t)).not.toMatch(/\s{2,}/)
      expect(t.length, 'empty text').toBeGreaterThan(0)
    }
  })

  it('has unique ids everywhere', () => {
    expect(dupes(CATEGORIES.map((c) => c.id))).toEqual([])
    expect(dupes(KVIZ_QUESTIONS.map((q) => q.id))).toEqual([])
    expect(dupes(BLEF_QUESTIONS.map((q) => q.id))).toEqual([])
    expect(dupes(WAVE_SCALES.map((s) => s.id))).toEqual([])
    expect(dupes(CARDS.map((c) => c.id))).toEqual([])
    expect(dupes(ALL_BADGES.map((b) => b.id))).toEqual([])
    expect(dupes(ALL_BADGES.map((b) => b.color))).toEqual([])
  })
})

describe('Uljez words', () => {
  // A word may sit in two categories (Kravata in Posao and Odeća), which is fine: the impostor only knows one.
  it('has no word twice in a category', () => {
    for (const c of CATEGORIES) expect(dupes(c.words.map((w) => w.toLowerCase())), c.id).toEqual([])
  })
  it('fits on the ticket', () => {
    // the longest today, "Glasovna poruka drugarici", was checked on a 375 px wide screen
    for (const w of CATEGORIES.flatMap((c) => c.words)) expect(w.length, w).toBeLessThanOrEqual(26)
  })
})

describe('Kviz questions', () => {
  it('has four different options with the right one not repeated among the wrong ones', () => {
    for (const q of KVIZ_QUESTIONS) {
      const opts = [q.a, ...q.w].map((o) => o.toLowerCase())
      expect(new Set(opts).size, q.id).toBe(4)
      expect(KVIZ_TOPICS).toContain(q.topic)
      expect([1, 2, 3]).toContain(q.level)
      expect(q.q.endsWith('?') || q.q.includes('___'), `${q.id} should be a question or a blank to fill`).toBe(true)
    }
  })
  it('keeps options short enough to read in ten seconds', () => {
    // a 36-character option wraps to two lines on a 375 px screen, which is still readable
    for (const q of KVIZ_QUESTIONS) for (const o of [q.a, ...q.w]) expect(o.length, `${q.id}: ${o}`).toBeLessThanOrEqual(36)
    for (const q of KVIZ_QUESTIONS) expect(q.q.length, q.id).toBeLessThanOrEqual(110)
  })
  it('does not ask the same thing twice', () => {
    expect(dupes(KVIZ_QUESTIONS.map((q) => q.q.toLowerCase()))).toEqual([])
  })
  it('has the id prefix of its topic', () => {
    const prefix: Record<string, string> = { heroji: 'h', gejming: 'g', film: 'f', zavicaj: 'z', istorija: 'i', srbija: 's' }
    for (const q of KVIZ_QUESTIONS) expect(q.id[0], q.id).toBe(prefix[q.topic])
  })
})

describe('Blef questions', () => {
  it('has exactly one blank and an answer that fits it', () => {
    for (const q of BLEF_QUESTIONS) {
      expect(q.q.split(BLANK).length - 1, q.id).toBe(1)
      expect(isTruth(q, q.a), q.id).toBe(true)
      for (const alt of q.alt ?? []) expect(isTruth(q, alt), `${q.id} ${alt}`).toBe(true)
    }
  })
  it('has house fakes that are not the answer, nor each other', () => {
    for (const q of BLEF_QUESTIONS) {
      for (const f of q.fakes) expect(isTruth(q, f), `${q.id}: fake "${f}" counts as the answer`).toBe(false)
      expect(normalizeAnswer(q.fakes[0]), q.id).not.toBe(normalizeAnswer(q.fakes[1]))
    }
  })
  it('does not ask the same thing twice', () => {
    expect(dupes(BLEF_QUESTIONS.map((q) => q.q.toLowerCase()))).toEqual([])
  })
})

describe('Talas scales', () => {
  it('has two different ends and no scale twice, even flipped', () => {
    const keys = WAVE_SCALES.map((s) => [s.left, s.right].map((x) => x.toLowerCase()).sort().join('|'))
    expect(dupes(keys)).toEqual([])
    for (const s of WAVE_SCALES) expect(s.left.toLowerCase()).not.toBe(s.right.toLowerCase())
  })
  it('fits both ends on a phone dial', () => {
    // the longest end today is "Najluđe iznenađenje na koncertu" (31)
    for (const s of WAVE_SCALES) for (const end of [s.left, s.right]) expect(end.length, s.id).toBeLessThanOrEqual(32)
  })
})
