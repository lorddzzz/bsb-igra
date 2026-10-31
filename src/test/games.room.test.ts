// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBlefActions } from '../blef/room'
import { cijaOf } from '../cija/logic'
import { useCijaActions } from '../cija/room'
import { currentQuestion as blefQuestion } from '../blef/logic'
import { roomPath, type RoomView } from '../game/room'
import type { Pub } from '../game/types'
import { GRACE_MS, kvizOf, LEAD_SECONDS, ANSWER_SECONDS, handOf } from '../kviz/logic'
import { useKvizActions } from '../kviz/room'
import { useLicActions } from '../licitacija/room'
import { leader, misijaOf, teamSize } from '../misija/logic'
import { useMisijaActions } from '../misija/room'
import { clueGiver, waveOf } from '../talas/logic'
import { useWaveActions } from '../talas/room'
import type { Backend } from '../backend'
import { phone, room, settle } from './phones'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// Isolation tests for each game's room actions: real hooks, several phones, one fake database.

const withPub =
  <A,>(use: (be: Backend, code: string, pub: Pub) => A) =>
  (be: Backend, code: string, view: RoomView) =>
    use(be, code, view.pub!)

async function table<A>(game: Parameters<typeof room>[0], n: number, use: (be: Backend, code: string, view: RoomView) => A) {
  const { db, code, uids } = await room(game, n)
  const phones = uids.map((u) => phone(db.phone(u), code, use))
  await settle()
  return { db, code, phones, pub: () => db.get(`${roomPath(code)}/pub`) as Pub }
}

describe('Blef', () => {
  it('moves to picking once everyone wrote, and a second fake from the same phone is ignored', async () => {
    const { phones, pub } = await table('blef', 3, withPub(useBlefActions))
    await act(async () => phones[1].actions.start())
    expect(pub().phase).toBe('lobby')
    await act(async () => phones[0].actions.start())
    await settle()
    const q = blefQuestion(pub())
    await act(async () => phones[0].actions.writeLie('  prva laž  '))
    await settle()
    await act(async () => phones[0].actions.writeLie('druga laž'))
    await settle()
    expect(pub().blef?.lies?.a).toBe('prva laž')
    await act(async () => phones[1].actions.writeLie('x'.repeat(80)))
    await act(async () => phones[2].actions.writeLie(q.a))
    await settle()
    expect(pub().blef?.lies?.b).toHaveLength(30)
    expect(pub().phase).toBe('pick')
    // the truth typed as a fake doesn't become a second truth
    const options = pub().blef?.options ?? []
    expect(options.filter((o) => o.text === q.a)).toHaveLength(1)
    // you can't pick your own fake
    const mine = options.find((o) => o.owners?.includes('a'))!
    await act(async () => phones[0].actions.pick(mine.id))
    await settle()
    expect(pub().blef?.picks?.a).toBeUndefined()
  })
})

describe('Čije je ovo?', () => {
  it('lets only the host set up the game, in the lobby', async () => {
    const { phones, pub } = await table('cija', 3, withPub(useCijaActions))
    await act(async () => phones[1].actions.setLevel('ljuto'))
    await act(async () => phones[1].actions.setRounds(5))
    await settle()
    expect(pub().cija).toBeUndefined()
    await act(async () => phones[0].actions.setLevel('ljuto'))
    await act(async () => phones[0].actions.setRounds(99))
    await settle()
    expect(pub().cija).toMatchObject({ level: 'ljuto', rounds: 5 })
    await act(async () => phones[0].actions.setRounds(1))
    await settle()
    expect(pub().cija?.rounds).toBe(2)
    // a double tap on start is one start
    await act(async () => {
      void phones[0].actions.start()
      void phones[0].actions.start()
    })
    await settle()
    expect(pub()).toMatchObject({ phase: 'write', round: 1, cija: { level: 'ljuto', rounds: 2 } })
    expect(cijaOf(pub()).prompts).toHaveLength(2)
    // settings are locked once the game has started
    await act(async () => phones[0].actions.setLevel('lagano'))
    await settle()
    expect(pub().cija?.level).toBe('ljuto')
  })

  it('plays a whole round: answers, a fair match-up, points, and the next prompt', async () => {
    const { phones, pub } = await table('cija', 3, withPub(useCijaActions))
    const [a, b, c] = phones
    await act(async () => a.actions.start())
    await settle()
    // empty, repeated and over-long answers
    await act(async () => a.actions.writeAnswer('   '))
    await settle()
    expect(cijaOf(pub()).answers?.a).toBeUndefined()
    await act(async () => a.actions.writeAnswer('  Pica  '))
    await act(async () => a.actions.writeAnswer('Burek'))
    await act(async () => b.actions.writeAnswer('x'.repeat(200)))
    await settle()
    expect(cijaOf(pub()).answers).toEqual({ a: 'Pica', b: 'x'.repeat(60) })
    expect(pub().phase).toBe('write')
    await act(async () => c.actions.writeAnswer('pica'))
    await settle()
    // everyone answered: the board is up, equal answers told apart, authors not shown by the order
    expect(pub().phase).toBe('match')
    expect(cijaOf(pub()).answers?.c).toBe('pica (2)')
    expect([...(cijaOf(pub()).order ?? [])].sort()).toEqual(['a', 'b', 'c'])

    // refused: own answer in the set, a friend twice, a missing answer
    await act(async () => a.actions.match({ a: 'b', b: 'c' }))
    await act(async () => a.actions.match({ b: 'c', c: 'c' }))
    await act(async () => a.actions.match({ b: 'c' }))
    await settle()
    expect(cijaOf(pub()).guesses).toBeUndefined()

    await act(async () => a.actions.match({ b: 'b', c: 'c' }))
    // a second submission does not change the first
    await act(async () => a.actions.match({ b: 'c', c: 'b' }))
    await act(async () => b.actions.match({ a: 'c', c: 'a' }))
    await settle()
    expect(cijaOf(pub()).guesses).toEqual({ a: { b: 'b', c: 'c' }, b: { a: 'c', c: 'a' } })
    expect(pub().phase).toBe('match')
    // nothing happens when scoring is asked for too early
    await act(async () => a.actions.closeMatching())
    expect(pub().phase).toBe('match')
    await act(async () => c.actions.match({ a: 'a', b: 'b' }))
    await settle()

    expect(pub().phase).toBe('result')
    // a and c matched both answers; b matched none, and the cap is 1 point per answer with 3 players
    const gains = cijaOf(pub()).result!.gains
    expect(gains.a).toMatchObject({ right: 2 })
    expect(gains.b).toMatchObject({ right: 0 })
    expect(gains.c).toMatchObject({ right: 2 })
    expect(pub().scores).toEqual({ a: 2 + gains.a.fooled!, b: gains.b.fooled!, c: 2 + gains.c.fooled! })

    // only the host moves on, and only once
    await act(async () => b.actions.next())
    expect(pub().phase).toBe('result')
    await act(async () => {
      void a.actions.next()
      void a.actions.next()
    })
    await settle()
    expect(pub()).toMatchObject({ phase: 'write', round: 2 })
    expect(cijaOf(pub()).answers).toBeUndefined()
  })

  it('ends after the last prompt and returns to a lobby that keeps the settings', async () => {
    const { phones, pub } = await table('cija', 3, withPub(useCijaActions))
    await act(async () => phones[0].actions.setRounds(2))
    await act(async () => phones[0].actions.start())
    await settle()
    for (let round = 1; round <= 2; round++) {
      for (const p of phones) await act(async () => p.actions.writeAnswer(`odgovor ${p.be.uid}`))
      await settle()
      const order = cijaOf(pub()).order!
      for (const p of phones) {
        const mine = order.filter((o) => o !== p.be.uid)
        await act(async () => p.actions.match(Object.fromEntries(mine.map((o) => [o, o]))))
      }
      await settle()
      expect(pub().phase).toBe('result')
      await act(async () => phones[0].actions.next())
      await settle()
    }
    expect(pub().phase).toBe('over')
    // everyone matched every answer right in both rounds: 2 points a round
    expect(Object.values(pub().scores ?? {})).toEqual([4, 4, 4])
    await act(async () => phones[1].actions.newGame())
    expect(pub().phase).toBe('over')
    await act(async () => phones[0].actions.newGame())
    await settle()
    expect(pub()).toMatchObject({ phase: 'lobby', round: 0, cija: { rounds: 2 } })
  })
})

describe('Talas', () => {
  it('lets only the clue giver choose and give the clue, and keeps the needle on the dial', async () => {
    const { phones, pub } = await table('talas', 3, withPub(useWaveActions))
    await act(async () => phones[0].actions.start())
    await settle()
    const giver = phones.find((p) => p.be.uid === clueGiver(pub()))!
    const others = phones.filter((p) => p !== giver)
    const scale = waveOf(pub()).choices![0]
    await act(async () => others[0].actions.chooseScale(scale))
    await settle()
    expect(waveOf(pub()).scale).toBeUndefined()
    // a clue before choosing a scale is refused
    await act(async () => giver.actions.giveClue('rano'))
    expect(pub().phase).toBe('clue')
    await act(async () => giver.actions.chooseScale(scale))
    await settle()
    await act(async () => others[0].actions.giveClue('nije moj red'))
    expect(pub().phase).toBe('clue')
    await act(async () => giver.actions.giveClue('  Pica u ponoć  '))
    await settle()
    expect(pub()).toMatchObject({ phase: 'aim', wave: { clue: 'Pica u ponoć' } })
    await act(async () => giver.actions.aim(50))
    await act(async () => others[0].actions.aim(140))
    await settle()
    expect(waveOf(pub()).guesses).toEqual({ [others[0].be.uid]: 100 })
    await act(async () => others[1].actions.aim(-3.6))
    await settle()
    expect(pub().phase).toBe('result')
    expect(pub().wave?.result?.round).toBe(1)
  })
})

describe('Kviz', () => {
  it('closes the question on time, and another phone takes over when the host goes quiet', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    const { db, phones, pub } = await table('kviz', 3, withPub(useKvizActions))
    const advance = async (ms: number) => {
      db.clock += ms
      await act(async () => {
        vi.advanceTimersByTime(ms)
      })
      await settle()
    }
    await act(async () => phones[0].actions.start())
    await settle()
    expect(pub().phase).toBe('question')
    // answering is closed during the lead-in
    await advance((LEAD_SECONDS + 1) * 1000)
    await act(async () => phones[1].actions.answer(2))
    await settle()
    expect(kvizOf(pub()).answers).toEqual({ b: 2 })
    // a second tap doesn't change the answer
    await act(async () => phones[1].actions.answer(3))
    await settle()
    expect(kvizOf(pub()).answers).toEqual({ b: 2 })

    // the host's phone locks; the others wait for the backup delay, then close the question themselves
    phones[0].unmount()
    await advance(ANSWER_SECONDS * 1000 + GRACE_MS)
    expect(pub().phase).toBe('question')
    // too late to answer now
    await act(async () => phones[2].actions.answer(1))
    await settle()
    expect(kvizOf(pub()).answers?.c).toBeUndefined()
    await advance(3200)
    expect(pub().phase).toBe('answer')
    expect(pub().round).toBe(1)
    // and they move on to question 2 after the reveal, again without the host
    await advance(4000 + 3200)
    expect(pub()).toMatchObject({ phase: 'question', round: 2 })
  })

  it('plays an attack card once and only on a friend who is still answering', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const { db, phones, pub } = await table('kviz', 3, withPub(useKvizActions))
    await act(async () => phones[0].actions.start())
    await settle()
    db.clock = (kvizOf(pub()).endsAt ?? 0) - 8000
    await act(async () => phones[1].actions.answer(0))
    await settle()
    const card = handOf(pub(), 'a')[0]
    // b already answered, so b can't be attacked
    await act(async () => phones[0].actions.attack(card, 'b'))
    expect(kvizOf(pub()).attacks).toBeUndefined()
    await act(async () => phones[0].actions.attack(card, 'c'))
    await settle()
    expect(kvizOf(pub()).attacks?.c).toMatchObject({ card, from: 'a' })
    expect(handOf(pub(), 'a')).toHaveLength(1)
    // one card per question
    await act(async () => phones[0].actions.attack(handOf(pub(), 'a')[0], 'c'))
    expect(handOf(pub(), 'a')).toHaveLength(1)
  })
})

describe('Licitacija', () => {
  it('counts both bids when the two phones lock in at the same moment', async () => {
    const { phones, pub } = await table('licitacija', 2, withPub(useLicActions))
    await act(async () => phones[0].actions.start())
    await settle()
    await act(async () => {
      await Promise.all([phones[0].actions.bid(7), phones[1].actions.bid(3)])
    })
    await settle()
    expect(pub().phase).toBe('duel')
    expect(pub().lic?.duel?.bids).toEqual({ a: 7, b: 3 })
    // both tap "Sledeća runda" at once: one step, not two
    await act(async () => {
      await Promise.all([phones[0].actions.next(), phones[1].actions.next()])
    })
    await settle()
    expect(pub()).toMatchObject({ phase: 'bid', round: 2 })
    // a used card can't be bid again
    await act(async () => phones[0].actions.bid(7))
    expect(pub().lic?.bids).toBeUndefined()
  })
})

describe('Misija', () => {
  it('keeps mission cards secret and lets any phone score the mission', async () => {
    const { db, code, phones, pub } = await table('misija', 5, useMisijaActions)
    await act(async () => phones[1].actions.setSpecials(2))
    expect(misijaOf(pub()).specials).toBeUndefined()
    await act(async () => phones[0].actions.setSpecials(9))
    await settle()
    // capped at what five players can have
    expect(misijaOf(pub()).specials).toBe(4)
    await act(async () => phones[0].actions.start())
    await settle()
    expect(pub().phase).toBe('intro')
    // everyone has their own role card, nobody can see the others' yet
    expect(phones.every((p) => p.view.ticket && (p.view.ticket as unknown as { role: string }).role)).toBe(true)
    expect(phones.every((p) => p.view.secret === null)).toBe(true)
    await act(async () => phones[0].actions.endIntro())
    await settle()

    const lead = phones.find((p) => p.be.uid === leader(pub()))!
    const size = teamSize(5, 1)
    const team = [lead.be.uid, ...phones.map((p) => p.be.uid).filter((u) => u !== lead.be.uid)].slice(0, size)
    for (const uid of team) {
      await act(async () => lead.actions.toggle(uid))
      await settle(2)
    }
    await act(async () => lead.actions.propose())
    await settle()
    expect(pub().phase).toBe('vote')
    for (const p of phones) await act(async () => p.actions.vote(true))
    await settle()
    expect(pub().phase).toBe('mission')
    // somebody not on the team can't play a card
    const outsider = phones.find((p) => !team.includes(p.be.uid))!
    await act(async () => outsider.actions.play(false))
    expect(db.get(`${roomPath(code)}/secret/misija/plays/m1/${outsider.be.uid}`)).toBeNull()
    for (const uid of team) await act(async () => phones.find((p) => p.be.uid === uid)!.actions.play(true))
    await settle(10)
    // all played: revealed, read and scored without anyone tapping
    expect(pub().phase).toBe('reveal')
    expect(misijaOf(pub()).results?.m1).toMatchObject({ ok: true, fails: 0 })
    await act(async () => phones[0].actions.next())
    await settle()
    expect(pub()).toMatchObject({ phase: 'team', round: 2 })
  })
})
