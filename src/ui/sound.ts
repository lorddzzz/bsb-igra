// Synthesised "stage speaker" sounds: no audio files to load.
// iOS only allows audio after a tap, so unlock() runs on the first touch.

let ctx: AudioContext | null = null
const MUTE_KEY = 'uljez-muted'

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
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
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
