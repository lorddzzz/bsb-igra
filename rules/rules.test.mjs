// Database rules, tested against the real Firebase emulator.
// Usage: npm run test:rules   (downloads the emulator once; needs Java)
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import { get, ref, set, update } from 'firebase/database'

let env
const room = 'rooms/ABCD'

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-uljez',
    database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') },
  })
})
after(() => env?.cleanup())
beforeEach(async () => {
  await env.clearDatabase()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database(), room), {
      pub: { hostUid: 'ana', phase: 'clues', round: 1 },
      tickets: { ana: { round: 1, word: 'Pica' }, bob: { round: 1, category: 'hrana' } },
      secret: { round: 1, word: 'Pica', impostors: ['bob'] },
    })
  })
})

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database()

describe('rooms', () => {
  it('need a sign-in to read or write anything', async () => {
    await assertFails(get(ref(db(null), `${room}/pub`)))
    await assertFails(set(ref(db(null), `${room}/pub/phase`), 'voting'))
    await assertSucceeds(get(ref(db('ana'), `${room}/pub`)))
  })

  it('show each player only their own ticket', async () => {
    await assertSucceeds(get(ref(db('bob'), `${room}/tickets/bob`)))
    await assertFails(get(ref(db('bob'), `${room}/tickets/ana`)))
    await assertFails(get(ref(db('bob'), `${room}/tickets`)))
  })

  it('let the category picker hand out everyone’s tickets', async () => {
    await assertSucceeds(update(ref(db('ana'), room), { 'tickets/bob': { round: 2, category: 'more' }, 'tickets/ana': { round: 2, word: 'Talas' } }))
  })

  it('keep the round’s answers hidden until the vote is over', async () => {
    for (const phase of ['lobby', 'category', 'clues', 'voting', 'intro', 'team', 'vote', 'mission', 'question', 'bid']) {
      await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${room}/pub/phase`), phase))
      await assertFails(get(ref(db('ana'), `${room}/secret`)))
    }
    for (const phase of ['reveal', 'guess', 'score', 'over']) {
      await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${room}/pub/phase`), phase))
      await assertSucceeds(get(ref(db('bob'), `${room}/secret`)))
    }
  })

  it('let a Misija player drop their mission card into the secret while it is hidden', async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${room}/pub/phase`), 'mission'))
    await assertSucceeds(set(ref(db('bob'), `${room}/secret/misija/plays/m1/bob`), false))
  })

  it('let players mark only themselves online', async () => {
    await assertSucceeds(set(ref(db('bob'), `${room}/online/bob`), true))
    await assertFails(set(ref(db('bob'), `${room}/online/ana`), true))
    await assertSucceeds(get(ref(db('bob'), `${room}/online`)))
  })

  it('refuse anything outside rooms', async () => {
    await assertFails(get(ref(db('ana'), '/')))
    await assertFails(set(ref(db('ana'), 'other/x'), 1))
  })
})
