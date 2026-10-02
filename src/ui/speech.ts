import { isMuted } from './sound'

// Spoken narration with the phone's own text-to-speech. iPhones have no Serbian voice, but Croatian
// reads Serbian latinica the same way, so that (or Bosnian) is the fallback.
const LANGS = ['sr', 'hr', 'bs']

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export function voice(): SpeechSynthesisVoice | null {
  const voices = synth()?.getVoices() ?? []
  for (const lang of LANGS) {
    const v = voices.find((x) => x.lang.toLowerCase().replace('_', '-').startsWith(lang))
    if (v) return v
  }
  return null
}

/** Voices load late on some browsers; resolves once they're in, or after a short wait. */
export function voicesReady(): Promise<void> {
  const s = synth()
  if (!s || s.getVoices().length) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener('voiceschanged', done)
      resolve()
    }
    s.addEventListener('voiceschanged', done)
    setTimeout(done, 1500)
  })
}

export function canSpeak(): boolean {
  return Boolean(synth() && voice() && !isMuted())
}

/** iOS only lets a page talk after a tap, so call this from the tap that leads to narration. */
export function prime() {
  const s = synth()
  if (!s) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  s.speak(u)
}

/** Says the text and resolves when done (or after a safety timeout, since iOS sometimes never says it's done). */
export function say(text: string): Promise<void> {
  const s = synth()
  const v = voice()
  if (!s || !v || isMuted()) return Promise.resolve()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v
    u.lang = v.lang
    u.rate = 0.9
    let finished = false
    const end = () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(end, 2000 + text.length * 120)
    u.onend = end
    u.onerror = end
    s.speak(u)
  })
}

export function stop() {
  synth()?.cancel()
}
