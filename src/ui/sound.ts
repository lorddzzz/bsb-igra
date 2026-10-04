// Synthesised "stage speaker" sounds: no audio files to load.
// iOS only allows audio after a tap, so unlock() runs on the first touch.

import type { GameId } from '../game/types'
import { hz, musicBus, musicStep, stepLength, TRACKS, type MusicOut } from './music'

let ctx: AudioContext | null = null
const MUTE_KEY = 'uljez-muted'
const MUSIC_KEY = 'druzina-music-off'

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* private mode */
  }
  syncMusic()
}

export function isMusicOff(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) === '1'
  } catch {
    return false
  }
}

export function setMusicOff(off: boolean) {
  try {
    localStorage.setItem(MUSIC_KEY, off ? '1' : '0')
  } catch {
    /* private mode */
  }
  syncMusic()
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
  }
  // iOS parks the context as 'interrupted' after a call or a locked screen.
  if (ctx.state !== 'running') void ctx.resume()
  syncMusic()
}

function noise(c: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  return src
}

function ready(): AudioContext | null {
  if (isMuted() || !ctx) return null
  return ctx
}

/** Snare roll that speeds up, ending in a hit. About 2.4 s. */
export function drumRoll() {
  const c = ready()
  if (!c) return
  duck(5)
  const t0 = c.currentTime
  let t = 0
  let gap = 0.11
  while (t < 2.2) {
    hit(c, t0 + t, 0.18 + (t / 2.2) * 0.3, 0.06)
    t += gap
    gap = Math.max(0.035, gap * 0.94)
  }
  hit(c, t0 + 2.3, 0.9, 0.35)
  boom(c, t0 + 2.3)
}

function hit(c: AudioContext, at: number, vol: number, len: number) {
  const src = noise(c, len)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 1800
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + len)
  src.connect(f).connect(g).connect(c.destination)
  src.start(at)
}

function boom(c: AudioContext, at: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.setValueAtTime(120, at)
  o.frequency.exponentialRampToValueAtTime(40, at + 0.5)
  g.gain.setValueAtTime(0.9, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.6)
  o.connect(g).connect(c.destination)
  o.start(at)
  o.stop(at + 0.6)
}

/** Crowd cheer: swelling filtered noise with a few whistles. */
export function cheer() {
  const c = ready()
  if (!c) return
  duck(2.8)
  const t0 = c.currentTime
  const src = noise(c, 2.6)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 1100
  f.Q.value = 0.6
  const g = c.createGain()
  g.gain.setValueAtTime(0.001, t0)
  g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.4)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.6)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t0)
  ;[0.3, 0.9, 1.4].forEach((d, i) => {
    const o = c.createOscillator()
    const og = c.createGain()
    o.frequency.setValueAtTime(1800 + i * 300, t0 + d)
    o.frequency.linearRampToValueAtTime(2600 + i * 200, t0 + d + 0.25)
    og.gain.setValueAtTime(0.08, t0 + d)
    og.gain.exponentialRampToValueAtTime(0.001, t0 + d + 0.3)
    o.connect(og).connect(c.destination)
    o.start(t0 + d)
    o.stop(t0 + d + 0.3)
  })
}

/** Record scratch for an escaped impostor. */
export function scratch() {
  const c = ready()
  if (!c) return
  duck(1.2)
  const t0 = c.currentTime
  ;[0, 0.22].forEach((d, i) => {
    const src = noise(c, 0.2)
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 3
    f.frequency.setValueAtTime(i ? 3000 : 600, t0 + d)
    f.frequency.exponentialRampToValueAtTime(i ? 500 : 2800, t0 + d + 0.18)
    const g = c.createGain()
    g.gain.setValueAtTime(0.7, t0 + d)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + d + 0.2)
    src.connect(f).connect(g).connect(c.destination)
    src.start(t0 + d)
  })
}

/** Short rising fanfare for the winner. */
export function fanfare() {
  const c = ready()
  if (!c) return
  duck(2)
  const t0 = c.currentTime
  ;[523, 659, 784, 1047].forEach((freq, i) => {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    const g = c.createGain()
    const at = t0 + i * 0.14
    g.gain.setValueAtTime(0.001, at)
    g.gain.exponentialRampToValueAtTime(0.15, at + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, at + (i === 3 ? 0.9 : 0.25))
    o.frequency.value = freq
    o.connect(g).connect(c.destination)
    o.start(at)
    o.stop(at + 1)
  })
}

/** Clock tick for the last seconds of a Kviz question; the final one is higher. */
export function tick(final = false) {
  const c = ready()
  if (!c) return
  const at = c.currentTime
  const o = c.createOscillator()
  o.type = 'square'
  o.frequency.value = final ? 1320 : 880
  const g = c.createGain()
  g.gain.setValueAtTime(0.12, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.12)
  o.connect(g).connect(c.destination)
  o.start(at)
  o.stop(at + 0.13)
}

// ---------------------------------------------------------------------------
// Background music: one loop per game, see music.ts.

const MUSIC_VOL = 0.2
const LOOKAHEAD = 0.6

let musicWanted: GameId | null = null
let music: { game: GameId; gain: GainNode; io: MusicOut; timer: number; step: number; next: number } | null = null

/** The room screen asks for its game's music (host phone only); it plays once audio is unlocked and not muted. */
export function setMusic(game: GameId | null) {
  musicWanted = game
  syncMusic()
}

function syncMusic() {
  const should = musicWanted && ctx && !isMuted() && !isMusicOff() ? musicWanted : null
  if (music && music.game !== should) stopMusic()
  if (should && !music) startMusic(should)
}

function startMusic(game: GameId) {
  const c = ctx!
  const track = TRACKS[game]
  const step = stepLength(track)
  const { gain, io } = musicBus(c, c.destination, 0, track)
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.gain.linearRampToValueAtTime(MUSIC_VOL, c.currentTime + 3)
  const m = { game, gain, io, timer: 0, step: 0, next: c.currentTime + 0.1 }
  const pump = () => {
    // After a locked screen the clock ran on without us: pick up from now instead of rushing.
    if (m.next < c.currentTime) m.next = c.currentTime + 0.05
    while (m.next < c.currentTime + LOOKAHEAD) {
      musicStep(c, m.io, track, m.step, m.next)
      m.step++
      m.next += step
    }
  }
  pump()
  m.timer = window.setInterval(pump, 150)
  music = m
}

function stopMusic() {
  const m = music!
  music = null
  window.clearInterval(m.timer)
  const c = ctx!
  m.gain.gain.cancelScheduledValues(c.currentTime)
  m.gain.gain.setTargetAtTime(0, c.currentTime, 0.2)
  window.setTimeout(() => m.gain.disconnect(), 1500)
}

/** Lowers the music while a big moment plays. */
/** Turns the music down for a while, e.g. under the narrator. */
export function duckMusic(seconds: number) {
  duck(seconds)
}

function duck(seconds: number) {
  if (!music || !ctx) return
  const g = music.gain.gain
  const t = ctx.currentTime
  g.cancelScheduledValues(t)
  g.setTargetAtTime(MUSIC_VOL * 0.2, t, 0.05)
  g.setTargetAtTime(MUSIC_VOL, t + seconds, 0.6)
}

// ---------------------------------------------------------------------------
// More effects. "Stage" ones play on the host phone; "personal" ones on the phone of whoever it's about.

function bell(c: AudioContext, midi: number, at: number, vol: number, len: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator()
  o.type = type
  o.frequency.value = hz(midi)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, at + len)
  o.connect(g).connect(c.destination)
  o.start(at)
  o.stop(at + len + 0.05)
}

/** Stage: someone checked in to the lobby. */
export function joinChime() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  bell(c, 76, t, 0.25, 0.5)
  bell(c, 83, t + 0.12, 0.25, 0.8)
}

/** Stage: airport "ding-dong-ding" when a game starts. */
export function boarding() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  duck(2)
  ;[72, 76, 79].forEach((n, i) => {
    bell(c, n, t + i * 0.32, 0.3, 1.4)
    bell(c, n + 12, t + i * 0.32, 0.06, 0.8)
  })
}

/** Stage: soft swoosh when the screen moves on. */
export function whoosh() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const src = noise(c, 0.6)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.5
  f.frequency.setValueAtTime(400, t)
  f.frequency.exponentialRampToValueAtTime(3500, t + 0.25)
  f.frequency.exponentialRampToValueAtTime(800, t + 0.55)
  const g = c.createGain()
  g.gain.setValueAtTime(0.001, t)
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.2)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
}

/** Stage: Kviz special round splash, a rising siren and a hit. */
export function special() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  duck(2.5)
  const o = c.createOscillator()
  o.type = 'sawtooth'
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 2500
  const g = c.createGain()
  o.frequency.setValueAtTime(300, t)
  o.frequency.exponentialRampToValueAtTime(1200, t + 0.9)
  g.gain.setValueAtTime(0.001, t)
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.3)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1)
  o.connect(f).connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 1)
  hit(c, t + 0.95, 0.8, 0.3)
  boom(c, t + 0.95)
  ;[84, 88, 91].forEach((n, i) => bell(c, n, t + 1 + i * 0.07, 0.1, 0.6))
}

/** Stage: a decent (not great) result, e.g. a close Talas guess. */
export function nice() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  ;[67, 71, 74].forEach((n, i) => bell(c, n, t + i * 0.1, 0.18, 0.7, 'triangle'))
}

/** Personal: tiny tap when you select something. */
export function pop() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.frequency.setValueAtTime(900, t)
  o.frequency.exponentialRampToValueAtTime(500, t + 0.06)
  const g = c.createGain()
  g.gain.setValueAtTime(0.18, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.1)
}

/** Personal: your vote, answer or guess is locked in. */
export function lock() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.frequency.setValueAtTime(220, t)
  o.frequency.exponentialRampToValueAtTime(90, t + 0.1)
  const g = c.createGain()
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.13)
  bell(c, 84, t + 0.06, 0.15, 0.35)
}

/** Personal: it's your turn to pick or give the clue. */
export function yourTurn() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  bell(c, 79, t, 0.25, 0.4, 'triangle')
  bell(c, 84, t + 0.13, 0.25, 0.7, 'triangle')
}

/** Personal: you got it right. */
export function correct() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  bell(c, 76, t, 0.3, 0.4)
  bell(c, 80, t + 0.1, 0.3, 0.4)
  bell(c, 83, t + 0.2, 0.3, 0.9)
}

/** Personal: you got it wrong (or ran out of time). */
export function wrong() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  ;[0, 0.22].forEach((d, i) => {
    const o = c.createOscillator()
    o.type = 'square'
    o.frequency.value = i ? 147 : 165
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 900
    const g = c.createGain()
    g.gain.setValueAtTime(0.16, t + d)
    g.gain.exponentialRampToValueAtTime(0.001, t + d + (i ? 0.45 : 0.2))
    o.connect(f).connect(g).connect(c.destination)
    o.start(t + d)
    o.stop(t + d + 0.5)
  })
}

/** Personal: a Kviz card just hit you. */
export function zap() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(1400, t)
  o.frequency.exponentialRampToValueAtTime(120, t + 0.35)
  const g = c.createGain()
  g.gain.setValueAtTime(0.18, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.42)
  hit(c, t, 0.5, 0.15)
}

/** Personal: you threw a card at someone. */
export function throwCard() {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const src = noise(c, 0.3)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 2
  f.frequency.setValueAtTime(800, t)
  f.frequency.exponentialRampToValueAtTime(5000, t + 0.25)
  const g = c.createGain()
  g.gain.setValueAtTime(0.001, t)
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.08)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
}
