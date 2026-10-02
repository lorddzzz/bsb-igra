/**
 * Simulated games: bots play each game start to finish through the real game logic, and every state
 * goes through firebaseShape on the way, exactly as it would between phones. The unit tests check
 * the rules hold in every state; the screen tests render every state on every phone.
 */
import { applyBlef, buildOptions, currentQuestion as blefQuestion, nextBlefRound, optionsOf as blefOptions, scoreBlef, startBlef } from '../blef/logic'
import {
  allGuessed,
  applyRound,
  categoryChoices,
  caughtImpostors,
  newGameSeed,
  nextRound,
  normalizeSecret,
  pickOne,
  playerOrder,
  resetToLobby,
  scoreRound,
  seededRng,
  setupRound,
  shuffle,
  type Rng,
} from '../game/logic'
import { ALL_BADGES, type GameId, type Mode, type Pub } from '../game/types'
import { applyKviz, kvizOf, nextQuestion, optionsOf as kvizOptions, playCard, questionStart, scoreKviz, startKviz, targets, handOf as kvizHand } from '../kviz/logic'
import { handOf as licHand, nextLic, nextSet, placeBid, startLic } from '../lic/logic'
import {
  afterReveal,
  applyMission,
  closeVote,
  leader,
  misijaOf,
  missionNo,
  mKey,
  proposeTeam,
  shoot,
  sideOf,
  startMisija,
  tallyMission,
  teamOf,
  teamSize,
} from '../misija/logic'
import type { MisijaSecret, MisijaTicket } from '../misija/types'
import { applyWave, clueGiver, guessers, nextWaveRound, scoreWave, startWave, waveOf } from '../wave/logic'
import { firebaseShape } from './firebaseShape'

export interface Snapshot {
  /** What just happened, for failure messages. */
  label: string
  pub: Pub
  /** Each phone's private card, as stored at rooms/{code}/tickets/{uid}. */
  tickets: Record<string, unknown>
  /** rooms/{code}/secret as stored. */
  secret: unknown
  /** Server clock at this moment. */
  now: number
}

export const UIDS = 'abcdefghijkl'.split('')
const NAMES = ['Dusan', 'Marko', 'Luka', 'Ivan', 'Ana', 'Mila', 'Sale', 'Iva', 'Jova', 'Neda', 'Pera', 'Zika']

/** A room in the lobby with n players who joined in order a, b, c... */
export function lobby(game: GameId, n: number, mode: Mode = 'normal'): Pub {
  const players = Object.fromEntries(
    UIDS.slice(0, n).map((uid, i) => [uid, { name: NAMES[i], badge: ALL_BADGES[i].id, joinedAt: 100 + i }]),
  )
  return firebaseShape({ hostUid: 'a', game, createdAt: 1, mode, phase: 'lobby', round: 0, players } as Pub)
}

/** Records snapshots, shaping every state like Firebase does. */
class Recorder {
  snaps: Snapshot[] = []
  pub: Pub
  tickets: Record<string, unknown> = {}
  secret: unknown = null
  now = 1_000_000
  constructor(pub: Pub) {
    this.pub = firebaseShape(pub)
    this.snap('lobby')
  }
  set(pub: Pub, label: string) {
    this.pub = firebaseShape(pub)
    this.snap(label)
  }
  snap(label: string) {
    this.snaps.push({
      label: `${label} (round ${this.pub.round}, ${this.pub.phase})`,
      pub: this.pub,
      tickets: firebaseShape(this.tickets) ?? {},
      secret: firebaseShape(this.secret),
      now: this.now,
    })
  }
}

const others = (pub: Pub, uid: string) => playerOrder(pub).filter((u) => u !== uid)

export function simUljez(seed: number, n: number, mode: Mode = 'quick'): Snapshot[] {
  const rng = seededRng(seed)
  const r = new Recorder(lobby('uljez', n, mode))
  const start = (p: Pub): Pub => ({
    ...resetToLobby(p),
    phase: 'category',
    round: 1,
    seed: newGameSeed(rng),
    pickerOffset: Math.floor(rng() * n),
    scores: Object.fromEntries(playerOrder(p).map((uid) => [uid, 0])),
  })
  r.set(start(r.pub), 'start')
  for (let guard = 0; guard < 40 && r.pub.phase !== 'over'; guard++) {
    const choice = pickOne(categoryChoices(r.pub), rng)
    const setup = setupRound(r.pub, choice.id, rng)
    r.secret = setup.secret
    r.tickets = setup.tickets
    r.set({ ...r.pub, phase: 'clues', category: choice.id, starter: setup.starter }, 'category picked')
    r.set({ ...r.pub, phase: 'voting' }, 'to voting')
    for (const voter of playerOrder(r.pub)) {
      const picks = shuffle(others(r.pub, voter), rng).slice(0, rng() < 0.4 ? 2 : 1)
      const votes = { ...(r.pub.votes ?? {}), [voter]: Object.fromEntries(picks.map((t) => [t, true])) }
      r.set({ ...r.pub, votes, locked: { ...(r.pub.locked ?? {}), [voter]: true } }, `${voter} voted`)
    }
    r.set({ ...r.pub, phase: 'reveal' }, 'reveal')
    const secret = normalizeSecret(r.secret)!
    if (caughtImpostors(r.pub, secret).length) {
      r.set({ ...r.pub, phase: 'guess' }, 'guess')
      for (const uid of caughtImpostors(r.pub, secret)) {
        const next = { ...r.pub, guesses: { ...(r.pub.guesses ?? {}), [uid]: pickOne(secret.options, rng) } }
        r.set(allGuessed(next, secret) ? applyRound(next, scoreRound(next, secret)) : next, `${uid} guessed`)
      }
    } else r.set(applyRound(r.pub, scoreRound(r.pub, secret)), 'scored')
    if (r.pub.phase === 'score') r.set(nextRound(r.pub), 'next round')
  }
  return r.snaps
}

export function simBlef(seed: number, n: number): Snapshot[] {
  const rng = seededRng(seed)
  const r = new Recorder(lobby('blef', n))
  r.set(startBlef(r.pub, rng), 'start')
  while (r.pub.phase !== 'over') {
    const q = blefQuestion(r.pub)
    for (const uid of playerOrder(r.pub)) {
      // a mix of made-up fakes, the house's own fakes, the real answer (typo'd) and copies of a friend's fake
      const roll = rng()
      const lies = r.pub.blef?.lies ?? {}
      const text =
        roll < 0.15
          ? q.a.toUpperCase() + '!'
          : roll < 0.35
            ? pickOne(q.fakes, rng)
            : roll < 0.45 && Object.values(lies).length
              ? Object.values(lies)[0]
              : `laž ${uid} ${Math.floor(rng() * 100)}`
      r.set({ ...r.pub, blef: { ...r.pub.blef, lies: { ...lies, [uid]: text.slice(0, 30) } } }, `${uid} wrote`)
    }
    r.set({ ...r.pub, phase: 'pick', blef: { ...r.pub.blef, options: buildOptions(r.pub, q, rng) } }, 'options')
    for (const uid of playerOrder(r.pub)) {
      const mine = blefOptions(r.pub).filter((o) => !(o.owners ?? []).includes(uid))
      r.set({ ...r.pub, blef: { ...r.pub.blef, picks: { ...(r.pub.blef?.picks ?? {}), [uid]: pickOne(mine, rng).id } } }, `${uid} picked`)
    }
    r.set(applyBlef(r.pub, scoreBlef(r.pub)), 'truth')
    r.set(nextBlefRound(r.pub), 'next')
  }
  return r.snaps
}

export function simWave(seed: number, n: number): Snapshot[] {
  const rng = seededRng(seed)
  const r = new Recorder(lobby('talas', n))
  r.set(startWave(r.pub, rng), 'start')
  while (r.pub.phase !== 'over') {
    const w = waveOf(r.pub)
    r.set({ ...r.pub, wave: { ...w, scale: pickOne(w.choices ?? [], rng) } }, `${clueGiver(r.pub)} chose a scale`)
    r.set({ ...r.pub, phase: 'aim', wave: { ...waveOf(r.pub), clue: 'Trag' } }, 'clue given')
    for (const uid of guessers(r.pub))
      r.set(
        { ...r.pub, wave: { ...waveOf(r.pub), guesses: { ...(waveOf(r.pub).guesses ?? {}), [uid]: Math.round(rng() * 100) } } },
        `${uid} aimed`,
      )
    r.set(applyWave(r.pub, scoreWave(r.pub)), 'result')
    r.set(nextWaveRound(r.pub, rng), 'next')
  }
  return r.snaps
}

export function simKviz(seed: number, n: number): Snapshot[] {
  const rng = seededRng(seed)
  const r = new Recorder(lobby('kviz', n))
  r.set(startKviz(r.pub, rng, r.now), 'start')
  while (r.pub.phase !== 'over') {
    r.now = questionStart(r.pub) + 500
    r.snap('question visible')
    // some players throw a card at a friend who hasn't answered yet
    for (const uid of playerOrder(r.pub)) {
      const hand = kvizHand(r.pub, uid)
      const victims = targets(r.pub, uid, r.now)
      if (!hand.length || !victims.length || rng() < 0.5) continue
      const next = playCard(r.pub, uid, pickOne(hand, rng), pickOne(victims, rng), r.now)
      if (next) r.set(next, `${uid} attacked`)
    }
    const { texts } = kvizOptions(r.pub)
    for (const uid of playerOrder(r.pub)) {
      r.now += 700
      if (rng() < 0.15) continue // ran out of time
      r.set({ ...r.pub, kviz: { ...kvizOf(r.pub), answers: { ...(kvizOf(r.pub).answers ?? {}), [uid]: Math.floor(rng() * texts.length) } } }, `${uid} answered`)
    }
    r.now = (kvizOf(r.pub).endsAt ?? r.now) + 900
    r.set(applyKviz(r.pub, scoreKviz(r.pub), r.now, rng), 'reveal')
    r.now = (kvizOf(r.pub).nextAt ?? r.now) + 10
    r.set(nextQuestion(r.pub, rng, r.now), 'next')
  }
  return r.snaps
}

export function simLic(seed: number): Snapshot[] {
  const rng = seededRng(seed)
  const r = new Recorder(lobby('licitacija', 2))
  r.set(startLic(r.pub, rng), 'start')
  for (let guard = 0; guard < 400 && r.pub.phase !== 'over'; guard++) {
    if (r.pub.phase === 'bid') {
      for (const uid of playerOrder(r.pub)) {
        // now and then both bid the same, to exercise the carried-over pot
        const hand = licHand(r.pub, uid)
        const theirs = r.pub.lic?.bids?.a
        const card = theirs !== undefined && hand.includes(theirs) && rng() < 0.3 ? theirs : pickOne(hand, rng)
        const next = placeBid(r.pub, uid, card)
        if (!next) throw new Error(`bid ${card} by ${uid} refused`)
        r.set(next, `${uid} bid ${card}`)
      }
    } else if (r.pub.phase === 'duel') r.set(nextLic(r.pub), 'next')
    else if (r.pub.phase === 'set') r.set(nextSet(r.pub, rng), 'next set')
  }
  return r.snaps
}

export function simMisija(seed: number, n: number, specials: number): Snapshot[] {
  const rng: Rng = seededRng(seed)
  const r = new Recorder({ ...lobby('misija', n), misija: { specials } })
  const s = startMisija(r.pub, rng)
  r.tickets = s.tickets
  r.secret = { misija: s.secret }
  r.set(s.pub, 'start')
  r.set({ ...r.pub, phase: 'team' }, 'intro done')
  const roles = s.secret.roles!
  for (let guard = 0; guard < 200 && r.pub.phase !== 'over'; guard++) {
    const p = r.pub
    if (p.phase === 'team') {
      const lead = leader(p)
      const team = [lead, ...shuffle(others(p, lead), rng)].slice(0, teamSize(n, missionNo(p)))
      for (const uid of team.slice(0, 2)) r.set({ ...r.pub, misija: { ...misijaOf(r.pub), team: { ...misijaOf(r.pub).team, [uid]: true } } }, `${lead} picks ${uid}`)
      const next = proposeTeam(r.pub, team)
      if (!next) throw new Error('team refused')
      r.set(next, `${lead} proposes`)
    } else if (p.phase === 'vote') {
      for (const uid of playerOrder(p)) r.set({ ...r.pub, misija: { ...misijaOf(r.pub), votes: { ...misijaOf(r.pub).votes, [uid]: rng() < 0.6 } } }, `${uid} voted`)
      r.set(closeVote(r.pub), 'vote closed')
    } else if (p.phase === 'mission') {
      for (const uid of teamOf(misijaOf(p).team)) {
        const sec = r.secret as { misija: MisijaSecret }
        const card = sideOf(roles[uid]) === 'ekipa' ? true : rng() < 0.4
        const plays = { ...sec.misija.plays, [mKey(missionNo(p))]: { ...sec.misija.plays?.[mKey(missionNo(p))], [uid]: card } }
        r.secret = { misija: { ...sec.misija, plays } }
        r.set({ ...r.pub, misija: { ...misijaOf(r.pub), played: { ...misijaOf(r.pub).played, [uid]: true } } }, `${uid} played`)
      }
      r.set({ ...r.pub, phase: 'reveal' }, 'reveal')
      const result = tallyMission(r.pub, firebaseShape(r.secret as { misija: MisijaSecret }).misija)
      if (!result) throw new Error('mission could not be scored')
      r.set(applyMission(r.pub, result), 'tallied')
      r.set(afterReveal(r.pub), 'after reveal')
    } else if (p.phase === 'guess') {
      r.set(shoot(p, pickOne(playerOrder(p), rng), roles), 'shot')
    }
  }
  return r.snaps
}

/** The private card each phone holds in a Misija snapshot. */
export const misijaTicketOf = (s: Snapshot, uid: string) => s.tickets[uid] as MisijaTicket | undefined
