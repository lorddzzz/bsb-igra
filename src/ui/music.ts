// Background music: one endless loop per game, synthesised note by note (no audio files).
// Every track is 16 bars: the first 8 are the quiet groove, the next 8 add the tune, then it starts over.
// Loosely in the "Družina" comic-book hero spirit: each game gets its own little hero theme.

import type { GameId } from '../game/types'

export interface MusicOut {
  /** Dry input of the music bus. */
  dry: AudioNode
  /** Echo send, for bells and leads. */
  echo: AudioNode
}

interface Chord {
  bass: number
  pad: number[]
  arp: number[]
}

/** A melody note: start (sixteenth in the bar), MIDI note, length in sixteenths. */
type Note = [number, number, number]

interface Beat {
  step: number
  bar: number
  pos: number
  chord: Chord
  full: boolean
  /** One sixteenth note, in seconds. */
  s: number
}

export interface Track {
  /** Shown nowhere yet; handy in tests and renders. */
  name: string
  bpm: number
  /** How late the off-beat sixteenths land, as a share of a sixteenth (0 = straight). */
  swing: number
  /** Echo time in sixteenths. */
  echo: number
  /** Loudness trim so all tracks sit at about the same level. */
  gain: number
  play(c: BaseAudioContext, io: MusicOut, b: Beat, at: number): void
  chords: Chord[]
}

const BARS = 16

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()
function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  let buf = noiseCache.get(c)
  if (!buf) {
    buf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseCache.set(c, buf)
  }
  return buf
}

// ---------------------------------------------------------------------------
// Instruments

interface Voice {
  type?: OscillatorType
  vol: number
  /** Seconds. */
  len: number
  attack?: number
  /** Linear fade out (sustained notes) instead of a pluck-style exponential decay. */
  hold?: boolean
  cutoff?: number
  /** Filter closes from cutoff * env down to cutoff over the note: a "wah" pluck. */
  env?: number
  detune?: number[]
  vibrato?: number
  echo?: boolean
}

function voice(c: BaseAudioContext, io: MusicOut, midi: number, at: number, v: Voice) {
  const g = c.createGain()
  const attack = v.attack ?? 0.005
  g.gain.setValueAtTime(0.0001, at)
  if (v.hold) {
    g.gain.linearRampToValueAtTime(v.vol, at + attack)
    g.gain.setValueAtTime(v.vol, at + Math.max(attack, v.len - 0.15))
    g.gain.linearRampToValueAtTime(0.0001, at + v.len)
  } else {
    g.gain.exponentialRampToValueAtTime(v.vol, at + attack)
    g.gain.exponentialRampToValueAtTime(0.001, at + v.len)
  }
  let input: AudioNode = g
  if (v.cutoff) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.value = v.env ? 4 : 0.7
    if (v.env) {
      f.frequency.setValueAtTime(v.cutoff * v.env, at)
      f.frequency.exponentialRampToValueAtTime(v.cutoff, at + Math.min(v.len, 0.3))
    } else f.frequency.value = v.cutoff
    f.connect(g)
    input = f
  }
  g.connect(io.dry)
  if (v.echo) g.connect(io.echo)
  let lfo: OscillatorNode | null = null
  let depth: GainNode | null = null
  if (v.vibrato) {
    lfo = c.createOscillator()
    lfo.frequency.value = 5.5
    depth = c.createGain()
    depth.gain.setValueAtTime(0, at)
    depth.gain.linearRampToValueAtTime(v.vibrato, at + Math.min(0.4, v.len / 2))
    lfo.connect(depth)
    lfo.start(at)
    lfo.stop(at + v.len + 0.05)
  }
  const detunes = v.detune ?? [0]
  for (const cents of detunes) {
    const o = c.createOscillator()
    o.type = v.type ?? 'sine'
    o.frequency.value = hz(midi)
    o.detune.value = cents
    if (depth) depth.connect(o.detune)
    if (detunes.length > 1) {
      const share = c.createGain()
      share.gain.value = 1 / detunes.length
      o.connect(share).connect(input)
    } else o.connect(input)
    o.start(at)
    o.stop(at + v.len + 0.05)
  }
}

/** Soft pad, one chord. */
function pad(c: BaseAudioContext, io: MusicOut, notes: number[], at: number, len: number, vol: number, cutoff = 1400, type: OscillatorType = 'triangle') {
  for (const n of notes) voice(c, io, n, at, { type, vol, len, attack: 0.35, hold: true, cutoff, detune: [-7, 7] })
}

function kick(c: BaseAudioContext, io: MusicOut, at: number, vol: number) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(140, at)
  o.frequency.exponentialRampToValueAtTime(45, at + 0.18)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.22)
  o.connect(g).connect(io.dry)
  o.start(at)
  o.stop(at + 0.25)
}

/** Pitched drum: tom or timpani. */
function tom(c: BaseAudioContext, io: MusicOut, at: number, midi: number, vol: number, len = 0.35) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(hz(midi) * 1.6, at)
  o.frequency.exponentialRampToValueAtTime(hz(midi), at + 0.06)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + len)
  o.connect(g).connect(io.dry)
  o.start(at)
  o.stop(at + len + 0.02)
}

function noiseHit(c: BaseAudioContext, out: AudioNode, at: number, vol: number, len: number, type: BiquadFilterType, freq: number, q = 1) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + len)
  src.connect(f).connect(g).connect(out)
  src.start(at, Math.random() * 0.5)
  src.stop(at + len + 0.02)
}

const hat = (c: BaseAudioContext, io: MusicOut, at: number, vol: number, len = 0.05) => noiseHit(c, io.dry, at, vol, len, 'highpass', 7000)
const clap = (c: BaseAudioContext, io: MusicOut, at: number, vol: number) => noiseHit(c, io.dry, at, vol, 0.12, 'bandpass', 1500)
const snare = (c: BaseAudioContext, io: MusicOut, at: number, vol: number) => {
  noiseHit(c, io.dry, at, vol, 0.14, 'bandpass', 2200, 0.8)
  tom(c, io, at, 55, vol * 0.5, 0.08)
}
const rim = (c: BaseAudioContext, io: MusicOut, at: number, vol: number) => noiseHit(c, io.dry, at, vol, 0.03, 'bandpass', 3800, 6)

/** Plays the notes of a melody bar that start on this step. */
function melody(bar: Note[] | undefined, pos: number, fn: (midi: number, len: number) => void) {
  if (!bar) return
  for (const [start, midi, len] of bar) if (start === pos) fn(midi, len)
}

const chord = (bass: number, pad: number[], arp: number[]): Chord => ({ bass, pad, arp })

// ---------------------------------------------------------------------------
// Uljez: "Senka". Sneaky spy-comic noir in D minor; a plucked bass that creeps chromatically,
// rim clicks, and in the second half a muted bell tune that keeps looking over its shoulder.

const ULJEZ_TUNE: Note[][] = [
  [[0, 74, 2], [4, 73, 2], [6, 74, 2], [10, 77, 4]],
  [[0, 76, 2], [4, 74, 2], [8, 69, 8]],
  [[0, 74, 2], [4, 73, 2], [6, 74, 2], [10, 70, 4]],
  [[0, 69, 4], [6, 73, 2], [8, 76, 6]],
]
const ULJEZ_BASS = [0, 0, 3, 0, 5, 6, 5, 3]

const uljez: Track = {
  name: 'Senka',
  bpm: 92,
  swing: 0,
  echo: 3,
  gain: 2.1,
  chords: [chord(38, [50, 53, 57], []), chord(38, [50, 53, 57], []), chord(34, [50, 53, 58], []), chord(33, [49, 52, 57], [])],
  play(c, io, { bar, pos, chord: ch, full, s }, at) {
    if (pos === 0) pad(c, io, ch.pad, at, s * 16, 0.035, 700)
    if (pos % 2 === 0) {
      const n = ch.bass + 12 + ULJEZ_BASS[pos / 2]
      voice(c, io, n, at, { type: 'sawtooth', vol: 0.22, len: s * 1.6, cutoff: 260, env: 5 })
    }
    if (pos === 0 || pos === 10) kick(c, io, at, 0.4)
    hat(c, io, at, pos % 4 === 2 ? 0.035 : 0.015, 0.03)
    if (pos === 4 || pos === 12) rim(c, io, at, 0.22)
    if (!full) return
    melody(ULJEZ_TUNE[bar % 4], pos, (n, len) =>
      voice(c, io, n, at, { type: 'triangle', vol: 0.11, len: s * len + 0.2, cutoff: 2200, echo: true }),
    )
  },
}

// ---------------------------------------------------------------------------
// Blef: "Poker lice". Swinging lounge jazz for a straight face: walking bass, brushed ride,
// electric piano stabs and a cheeky vibraphone tune.

const BLEF_TUNE: Note[][] = [
  [[0, 69, 3], [3, 72, 3], [6, 77, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 71, 3], [3, 74, 3], [6, 77, 6], [14, 76, 2]],
  [[0, 76, 6], [6, 71, 2], [8, 72, 8]],
  [[0, 73, 3], [3, 76, 3], [6, 79, 4], [12, 77, 2], [14, 76, 2]],
]

const blef: Track = {
  name: 'Poker lice',
  bpm: 108,
  swing: 0.33,
  echo: 4,
  gain: 1.9,
  // Dm7, G7, Cmaj7, A7. arp = the walking bass line for the bar.
  chords: [
    chord(38, [53, 57, 60, 64], [38, 41, 45, 42]),
    chord(43, [53, 59, 62, 65], [43, 47, 50, 47]),
    chord(36, [52, 55, 59, 64], [36, 40, 43, 44]),
    chord(45, [55, 61, 64, 67], [45, 49, 52, 49]),
  ],
  play(c, io, { bar, pos, chord: ch, full, s }, at) {
    if (pos % 4 === 0) voice(c, io, ch.arp[pos / 4], at, { type: 'triangle', vol: 0.32, len: s * 3.5, cutoff: 900 })
    // Ride: ding, ding-a, ding, ding-a.
    if (pos % 4 === 0 || pos === 6 || pos === 14) noiseHit(c, io.dry, at, 0.05, 0.25, 'highpass', 5500)
    if (pos === 4 || pos === 12) hat(c, io, at, 0.06, 0.04)
    // Electric piano stab on the "and" of 2 and on 4.
    if (pos === 6 || (full && pos === 12))
      for (const n of ch.pad) voice(c, io, n, at, { type: 'sine', vol: 0.05, len: s * 4, detune: [-4, 4] })
    if (pos === 0) kick(c, io, at, 0.25)
    if (!full) return
    melody(BLEF_TUNE[bar % 4], pos, (n, len) => {
      voice(c, io, n, at, { type: 'sine', vol: 0.12, len: s * len + 0.4, vibrato: 12, echo: true })
      voice(c, io, n + 24, at, { type: 'sine', vol: 0.02, len: 0.3 })
    })
  },
}

// ---------------------------------------------------------------------------
// Talas: "Talasi". Slow and dreamy: a pad that breathes like a wave, gentle surf every two bars,
// and a rippling arpeggio in the second half.

const TALAS_ARP = [0, 1, 2, 3, 2, 3, 1, 2]

const talas: Track = {
  name: 'Talasi',
  bpm: 76,
  swing: 0,
  echo: 6,
  gain: 1.55,
  // Cmaj7, Am9, Fmaj7, G6.
  chords: [
    chord(36, [55, 59, 64], [60, 64, 67, 71]),
    chord(33, [55, 60, 64], [57, 60, 64, 71]),
    chord(29, [57, 60, 64], [60, 64, 65, 69]),
    chord(31, [55, 59, 64], [59, 62, 64, 67]),
  ],
  play(c, io, { bar, pos, chord: ch, full, s }, at) {
    if (pos === 0) {
      // The pad swells in and out with the filter: one wave per bar.
      const len = s * 16
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(500, at)
      f.frequency.linearRampToValueAtTime(1800, at + len / 2)
      f.frequency.linearRampToValueAtTime(500, at + len)
      const sub: MusicOut = { dry: f, echo: io.echo }
      f.connect(io.dry)
      for (const n of ch.pad) voice(c, sub, n, at, { type: 'sawtooth', vol: 0.035, len: len + 0.3, attack: 0.8, hold: true, detune: [-9, 9] })
      voice(c, io, ch.bass + 12, at, { type: 'sine', vol: 0.12, len, attack: 0.1, hold: true })
    }
    if (pos === 0 && bar % 2 === 0) {
      // Surf: noise that rolls in and out over two bars.
      const src = c.createBufferSource()
      src.buffer = noiseBuffer(c)
      src.loop = true
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      const len = s * 32
      f.frequency.setValueAtTime(300, at)
      f.frequency.linearRampToValueAtTime(1400, at + len * 0.4)
      f.frequency.linearRampToValueAtTime(300, at + len)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.linearRampToValueAtTime(0.06, at + len * 0.4)
      g.gain.linearRampToValueAtTime(0.0001, at + len)
      src.connect(f).connect(g).connect(io.dry)
      src.start(at)
      src.stop(at + len + 0.05)
    }
    if (pos === 0) kick(c, io, at, 0.3)
    if (pos % 4 === 2) noiseHit(c, io.dry, at, 0.025, 0.07, 'highpass', 6000)
    if (!full || pos % 2) return
    const n = ch.arp[TALAS_ARP[pos / 2]] + 12
    voice(c, io, n, at, { type: 'sine', vol: 0.08, len: 0.7, echo: true })
  },
}

// ---------------------------------------------------------------------------
// Kviz: "Brzi um". Quick-thinking hero energy: four on the floor, pumping octave bass,
// and a bright synth arpeggio once the second half kicks in.

const KVIZ_ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1]

const kviz: Track = {
  name: 'Brzi um',
  bpm: 126,
  swing: 0,
  echo: 3,
  gain: 1.65,
  // Em, C, G, D.
  chords: [
    chord(40, [55, 59, 64], [64, 67, 71, 76]),
    chord(36, [55, 60, 64], [64, 67, 72, 76]),
    chord(43, [55, 59, 62], [62, 67, 71, 74]),
    chord(38, [54, 57, 62], [62, 66, 69, 74]),
  ],
  play(c, io, { pos, chord: ch, full, s }, at) {
    if (pos % 4 === 0) kick(c, io, at, 0.5)
    if (pos % 4 === 2) hat(c, io, at, full ? 0.07 : 0.05, 0.09)
    if (full && (pos === 4 || pos === 12)) clap(c, io, at, 0.14)
    if (pos % 2 === 0) {
      const n = ch.bass + (pos % 4 === 2 ? 12 : 0)
      voice(c, io, n, at, { type: 'sawtooth', vol: 0.2, len: s * 1.8, cutoff: 380, env: 3 })
    }
    if (pos === 0) pad(c, io, ch.pad, at, s * 16, 0.03, 1100, 'sawtooth')
    if (!full) return
    const n = ch.arp[KVIZ_ARP[pos]] + 12
    voice(c, io, n, at, { type: 'square', vol: 0.035, len: s * 1.5, cutoff: 3000, echo: pos % 4 === 0 })
  },
}

// ---------------------------------------------------------------------------
// Licitacija: "Dvoboj". A two-hero showdown, spaghetti-western style: a tense low ostinato,
// pounding toms, and a lonely whistled tune.

const LIC_TUNE: Note[][] = [
  [[0, 76, 6], [6, 81, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 74, 4], [4, 76, 12]],
  [[0, 77, 6], [6, 76, 2], [8, 74, 8]],
  [[0, 76, 16]],
  [[0, 81, 6], [6, 84, 2], [8, 83, 4], [12, 81, 4]],
  [[0, 79, 4], [4, 76, 12]],
  [[0, 77, 6], [6, 76, 2], [8, 74, 4], [12, 72, 4]],
  [[0, 71, 8], [8, 68, 8]],
]
const LIC_OSTINATO = [0, 3, 6, 8, 11, 14]

const licitacija: Track = {
  name: 'Dvoboj',
  bpm: 100,
  swing: 0,
  echo: 6,
  gain: 1.25,
  // Am, Am, Bb, Am, Am, Am, F, E.
  chords: [
    chord(33, [57, 60, 64], []),
    chord(33, [57, 60, 64], []),
    chord(34, [58, 62, 65], []),
    chord(33, [57, 60, 64], []),
    chord(33, [57, 60, 64], []),
    chord(33, [57, 60, 64], []),
    chord(29, [57, 60, 65], []),
    chord(28, [56, 59, 64], []),
  ],
  play(c, io, { bar, pos, chord: ch, full, s }, at) {
    if (LIC_OSTINATO.includes(pos)) {
      const n = ch.bass + (pos === 14 ? 19 : 12)
      voice(c, io, n, at, { type: 'sawtooth', vol: 0.2, len: s * 2, cutoff: 300, env: 4 })
    }
    if (pos === 0) {
      tom(c, io, at, ch.bass, 0.55, 0.6)
      pad(c, io, ch.pad, at, s * 16, 0.025, 900)
    }
    if (pos === 8) tom(c, io, at, ch.bass + 7, 0.35, 0.4)
    if (pos === 14 && bar % 2 === 1) tom(c, io, at, ch.bass + 12, 0.25, 0.25)
    if (pos === 4 || pos === 12) rim(c, io, at, 0.12)
    if (!full) return
    // Tremolo strings on the fifth, very soft.
    if (pos % 2 === 0) voice(c, io, ch.pad[2] + 12, at, { type: 'sawtooth', vol: 0.018, len: s * 1.6, cutoff: 2500 })
    melody(LIC_TUNE[bar % 8], pos, (n, len) =>
      voice(c, io, n, at, { type: 'sine', vol: 0.11, len: s * len, attack: 0.04, hold: true, vibrato: 18, echo: true }),
    )
  },
}

// ---------------------------------------------------------------------------
// Misija: "Družina". The team's anthem: a marching snare, timpani, brass chords and,
// in the second half, the hero horn tune.

const MISIJA_TUNE: Note[][] = [
  [[0, 62, 4], [4, 65, 2], [6, 69, 6], [12, 67, 2], [14, 65, 2]],
  [[0, 70, 6], [6, 69, 2], [8, 65, 8]],
  [[0, 65, 4], [4, 69, 4], [8, 72, 8]],
  [[0, 72, 6], [6, 70, 2], [8, 69, 4], [12, 67, 4]],
  [[0, 62, 4], [4, 65, 2], [6, 69, 6], [12, 74, 4]],
  [[0, 74, 6], [6, 72, 2], [8, 70, 8]],
  [[0, 69, 4], [4, 72, 4], [8, 77, 8]],
  [[0, 76, 8], [8, 72, 4], [12, 69, 4]],
]
const MARCH = new Map([[0, 0.2], [3, 0.08], [4, 0.12], [6, 0.08], [8, 0.18], [10, 0.08], [11, 0.08], [12, 0.12]])

const misija: Track = {
  name: 'Družina',
  bpm: 88,
  swing: 0,
  echo: 6,
  gain: 1.55,
  // Dm, Bb, F, C.
  chords: [
    chord(38, [57, 62, 65], []),
    chord(34, [58, 62, 65], []),
    chord(41, [57, 60, 65], []),
    chord(36, [55, 60, 64], []),
  ],
  play(c, io, { bar, pos, chord: ch, full, s }, at) {
    if (pos === 0 || pos === 8) tom(c, io, at, ch.bass, 0.5, 0.7)
    const sn = MARCH.get(pos)
    if (sn) snare(c, io, at, full ? sn : sn * 0.6)
    if (pos % 2 === 0) voice(c, io, ch.bass + (pos % 4 === 0 ? 0 : 12), at, { type: 'triangle', vol: 0.26, len: s * 1.7, cutoff: 700 })
    // Brass: a swelling chord on 1, a short punch on the "and" of 3.
    if (pos === 0) for (const n of ch.pad) voice(c, io, n, at, { type: 'sawtooth', vol: 0.04, len: s * 9, attack: 0.12, hold: true, cutoff: 1500, detune: [-6, 6] })
    if (pos === 10) for (const n of ch.pad) voice(c, io, n, at, { type: 'sawtooth', vol: 0.035, len: s * 4, attack: 0.03, hold: true, cutoff: 1800, detune: [-6, 6] })
    if (!full) return
    melody(MISIJA_TUNE[bar % 8], pos, (n, len) =>
      voice(c, io, n, at, { type: 'sawtooth', vol: 0.09, len: s * len, attack: 0.06, hold: true, cutoff: 1600, vibrato: 10, echo: true }),
    )
  },
}

export const TRACKS: Record<GameId, Track> = { uljez, blef, talas, kviz, licitacija, misija }

/** One sixteenth note of a track, in seconds. */
export const stepLength = (t: Track) => 60 / t.bpm / 4

/** Builds the bus (gain, echo) a track plays into. */
export function musicBus(c: BaseAudioContext, out: AudioNode, volume: number, track: Track): { gain: GainNode; io: MusicOut } {
  const gain = c.createGain()
  gain.gain.value = volume
  gain.connect(out)
  const trim = c.createGain()
  trim.gain.value = track.gain
  trim.connect(gain)
  const delay = c.createDelay(2)
  delay.delayTime.value = stepLength(track) * track.echo
  const feedback = c.createGain()
  feedback.gain.value = 0.32
  const wet = c.createGain()
  wet.gain.value = 0.4
  delay.connect(feedback).connect(delay)
  delay.connect(wet).connect(trim)
  return { gain, io: { dry: trim, echo: delay } }
}

/** When step `step` sounds, counting from a straight grid at `at`: off-beat sixteenths swing late. */
export function swungTime(track: Track, step: number, at: number) {
  return step % 2 ? at + track.swing * stepLength(track) : at
}

/** Schedules one sixteenth step of a track at time `at`. Steps count from 0 forever. */
export function musicStep(c: BaseAudioContext, io: MusicOut, track: Track, step: number, at: number) {
  const bar = Math.floor(step / 16) % BARS
  const b: Beat = {
    step,
    bar,
    pos: step % 16,
    chord: track.chords[bar % track.chords.length],
    full: bar >= BARS / 2,
    s: stepLength(track),
  }
  track.play(c, io, b, swungTime(track, step, at))
}
