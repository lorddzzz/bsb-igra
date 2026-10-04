import { playerOrder, shuffle, type Rng } from '../game/logic'
import type { Pub } from '../game/types'
import type { MisijaSecret, MisijaState, MisijaTicket, MissionResult, Role, Side, TeamVote } from './types'

export const MIN_MISIJA_PLAYERS = 5
export const MAX_MISIJA_PLAYERS = 12
export const MISSIONS = 5
/** Missions a side needs to win. */
export const TO_WIN = 3
/** The 5th proposal for the same mission goes on the mission without a vote. */
export const FORCED_AFTER = 4

/** Special roles in the order they come into play; each one builds on the ones before it. */
export const SPECIAL_ORDER: Role[] = ['menadzer', 'telohranitelj', 'imitator', 'senka', 'fan']

export const ROLES: Record<Role, { name: string; icon: string; side: Side; text: string }> = {
  ekipa: { name: 'Ekipa', icon: '🦸', side: 'ekipa', text: 'Na misiji uvek igraš Uspeh. Pronađi špijune i ne vodi ih na misije.' },
  menadzer: {
    name: 'Vidovnjak',
    icon: '🔮',
    side: 'ekipa',
    text: 'Znaš ko su špijuni. Navodi ekipu, ali pažljivo: ako vas pobede, špijuni pogađaju ko si i mogu da ukradu pobedu.',
  },
  telohranitelj: {
    name: 'Telohranitelj',
    icon: '🛡️',
    side: 'ekipa',
    text: 'Znaš ko je Vidovnjak. Čuvaj ga i skreći pažnju špijuna na sebe.',
  },
  spijun: { name: 'Špijun', icon: '🦹', side: 'spijuni', text: 'Sabotiraj misije, ali tako da te ne provale.' },
  imitator: {
    name: 'Imitator',
    icon: '🎭',
    side: 'spijuni',
    text: 'Špijun koga Telohranitelj vidi kao Vidovnjaka. Glumi Vidovnjaka!',
  },
  senka: { name: 'Senka', icon: '👤', side: 'spijuni', text: 'Špijun koga ni Vidovnjak ne vidi.' },
  fan: {
    name: 'Samotnjak',
    icon: '🐺',
    side: 'spijuni',
    text: 'Špijun koji radi sam: ne znaš ostale špijune i oni ne znaju tebe.',
  },
}

export function misijaOf(pub: Pub): MisijaState {
  return pub.misija ?? {}
}

export function spyCount(players: number): number {
  if (players >= 10) return 4
  if (players >= 7) return 3
  return 2
}

/** Team sizes per mission, by player count. */
const SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
}
const BIG = [3, 4, 4, 5, 5]

export function teamSize(players: number, mission: number): number {
  return (SIZES[players] ?? BIG)[Math.min(Math.max(mission, 1), MISSIONS) - 1]
}

/** Sabotages it takes to fail a mission: 2 on the 4th one with 7 or more players. */
export function failsNeeded(players: number, mission: number): number {
  return mission === 4 && players >= 7 ? 2 : 1
}

/** The most special roles this many players can have: the 5th (Samotnjak) is a third special spy. */
export function maxSpecials(players: number): number {
  return spyCount(players) >= 3 ? 5 : 4
}

export function specialsIn(pub: Pub): number {
  return Math.min(misijaOf(pub).specials ?? 0, maxSpecials(playerOrder(pub).length))
}

export function leader(pub: Pub): string {
  const order = playerOrder(pub)
  const m = misijaOf(pub)
  return order[((m.offset ?? 0) + (m.turn ?? 0)) % order.length]
}

/** Current mission number, 1 to 5 (pub.round). */
export function missionNo(pub: Pub): number {
  return Math.max(pub.round, 1)
}

/** Database key for a mission; not a bare number, which Firebase would turn into a list. */
export const mKey = (mission: number) => `m${mission}`

export function resultsOf(pub: Pub): MissionResult[] {
  const results = misijaOf(pub).results ?? {}
  const list: MissionResult[] = []
  for (let i = 1; i <= MISSIONS; i++) if (results[mKey(i)]) list.push(results[mKey(i)])
  return list
}

export function wins(pub: Pub): { ekipa: number; spijuni: number } {
  const list = resultsOf(pub)
  return { ekipa: list.filter((r) => r.ok).length, spijuni: list.filter((r) => !r.ok).length }
}

export function teamOf(team: Record<string, boolean> | undefined): string[] {
  return Object.keys(team ?? {}).filter((uid) => team![uid])
}

export function isForced(pub: Pub): boolean {
  return (misijaOf(pub).rejects ?? 0) >= FORCED_AFTER
}

/** Deals roles: the spies, then the special roles in their fixed order. */
export function dealRoles(uids: string[], specials: number, rng: Rng): Record<string, Role> {
  const order = shuffle(uids, rng)
  const nSpies = spyCount(uids.length)
  const spies = order.slice(0, nSpies)
  const crew = order.slice(nSpies)
  const level = Math.min(specials, maxSpecials(uids.length))
  const roles: Record<string, Role> = {}
  for (const uid of crew) roles[uid] = 'ekipa'
  for (const uid of spies) roles[uid] = 'spijun'
  let c = 0
  let s = 0
  for (const role of SPECIAL_ORDER.slice(0, level)) {
    if (ROLES[role].side === 'ekipa') roles[crew[c++]] = role
    else roles[spies[s++]] = role
  }
  return roles
}

/** Who each role gets to see, as everyone's private card. */
export function ticketsFor(roles: Record<string, Role>, game: string): Record<string, MisijaTicket> {
  const uids = Object.keys(roles)
  const who = (...rs: Role[]) => uids.filter((u) => rs.includes(roles[u]))
  const tickets: Record<string, MisijaTicket> = {}
  for (const uid of uids) {
    const role = roles[uid]
    let sees: string[] = []
    if (role === 'spijun' || role === 'imitator' || role === 'senka')
      sees = who('spijun', 'imitator', 'senka').filter((u) => u !== uid)
    else if (role === 'menadzer') sees = who('spijun', 'imitator', 'fan')
    else if (role === 'telohranitelj') sees = who('menadzer', 'imitator')
    tickets[uid] = { game, role, sees: sees.sort() }
  }
  return tickets
}

export function sideOf(role: Role | undefined): Side {
  return role ? ROLES[role].side : 'ekipa'
}

export function newGameId(rng: Rng): string {
  return Math.floor(rng() * 2 ** 31).toString(36)
}

/** Starts a game; the roles go out separately as private tickets plus the secret. */
export function startMisija(pub: Pub, rng: Rng): { pub: Pub; tickets: Record<string, MisijaTicket>; secret: MisijaSecret } {
  const order = playerOrder(pub)
  const m = misijaOf(pub)
  const game = newGameId(rng)
  const roles = dealRoles(order, m.specials ?? 0, rng)
  return {
    pub: {
      ...pub,
      phase: 'intro',
      round: 1,
      misija: {
        specials: m.specials ?? 0,
        tally: m.tally,
        game,
        offset: Math.floor(rng() * order.length),
        turn: 0,
        rejects: 0,
      },
    },
    tickets: ticketsFor(roles, game),
    secret: { game, roles },
  }
}

/** One line of the narrator's opening, then a quiet pause (seconds) for players to do what it says. */
export interface IntroLine {
  text: string
  pause: number
}

/**
 * The narrator's opening before the first mission, read out by the host phone: the classic
 * eyes-closed round where the roles in play find each other. Only mentions roles that are in the game.
 */
export function introScript(specials: number, firstLeader: string): IntroLine[] {
  const has = (role: Role) => SPECIAL_ORDER.indexOf(role) < specials
  const lines: IntroLine[] = [
    { text: 'Dobro došli u Misiju.', pause: 1 },
    { text: 'Držite svoju kartu i pogledajte tajnu ulogu. Nikome je ne pokazujte.', pause: 7 },
    { text: 'Sada svi spustite telefone i zatvorite oči.', pause: 4 },
  ]
  lines.push({
    text: has('fan')
      ? 'Špijuni, otvorite oči i pogledajte se. Samotnjak ostaje zatvorenih očiju.'
      : 'Špijuni, otvorite oči i pogledajte se.',
    pause: 6,
  })
  lines.push({ text: 'Špijuni, zatvorite oči.', pause: 3 })
  if (has('menadzer')) {
    lines.push({
      text: has('senka')
        ? 'Špijuni, podignite palac. Senka, ti ne podižeš palac.'
        : has('fan')
          ? 'Špijuni i Samotnjak, podignite palac.'
          : 'Špijuni, podignite palac.',
      pause: 3,
    })
    lines.push({ text: 'Vidovnjače, otvori oči i zapamti ko su špijuni.', pause: 6 })
    lines.push({ text: 'Vidovnjače, zatvori oči. Špijuni, spustite palac.', pause: 3 })
  }
  if (has('telohranitelj')) {
    lines.push({
      text: has('imitator') ? 'Vidovnjače i Imitatore, podignite palac.' : 'Vidovnjače, podigni palac.',
      pause: 3,
    })
    lines.push({
      text: has('imitator')
        ? 'Telohranitelju, otvori oči. Jedan od njih je pravi Vidovnjak, drugi je Imitator.'
        : 'Telohranitelju, otvori oči i zapamti ko je Vidovnjak.',
      pause: 6,
    })
    lines.push({ text: 'Telohranitelju, zatvori oči. Spustite palac.', pause: 3 })
  }
  lines.push({ text: 'Svi otvorite oči.', pause: 2 })
  lines.push({ text: `Misija počinje! Prvi vođa je ${firstLeader}.`, pause: 0 })
  return lines
}

/** The leader's proposal: straight to the mission on the forced 5th proposal, else to a vote. */
export function proposeTeam(pub: Pub, team: string[]): Pub | undefined {
  const size = teamSize(playerOrder(pub).length, missionNo(pub))
  const unique = [...new Set(team)].filter((uid) => pub.players?.[uid])
  if (unique.length !== size) return undefined
  const picked = Object.fromEntries(unique.map((uid) => [uid, true]))
  const m = misijaOf(pub)
  if (isForced(pub)) {
    const lastVote: TeamVote = { mission: missionNo(pub), leader: leader(pub), team: picked, approved: true }
    return { ...pub, phase: 'mission', misija: { ...m, team: picked, votes: undefined, played: undefined, lastVote } }
  }
  return { ...pub, phase: 'vote', misija: { ...m, team: picked, votes: undefined, played: undefined } }
}

export function allVoted(pub: Pub): boolean {
  const votes = misijaOf(pub).votes ?? {}
  return playerOrder(pub).every((uid) => typeof votes[uid] === 'boolean')
}

/** Counts the team vote: a strict majority sends the team, a tie or less passes the lead on. */
export function closeVote(pub: Pub): Pub {
  const m = misijaOf(pub)
  const order = playerOrder(pub)
  const votes = Object.fromEntries(order.filter((u) => typeof m.votes?.[u] === 'boolean').map((u) => [u, m.votes![u]]))
  const yes = Object.values(votes).filter(Boolean).length
  const approved = yes * 2 > order.length
  const lastVote: TeamVote = { mission: missionNo(pub), leader: leader(pub), team: m.team ?? {}, votes, approved }
  if (approved) return { ...pub, phase: 'mission', misija: { ...m, votes: undefined, played: undefined, lastVote } }
  return {
    ...pub,
    phase: 'team',
    misija: { ...m, team: undefined, votes: undefined, lastVote, turn: (m.turn ?? 0) + 1, rejects: (m.rejects ?? 0) + 1 },
  }
}

export function allPlayed(pub: Pub): boolean {
  const m = misijaOf(pub)
  return teamOf(m.team).every((uid) => m.played?.[uid])
}

/** Scores the mission from the secret cards. Crew members can only play success, whatever reached the database. */
export function tallyMission(pub: Pub, secret: MisijaSecret): MissionResult | null {
  const m = misijaOf(pub)
  if (secret.game !== m.game) return null
  const mission = missionNo(pub)
  const cards = secret.plays?.[mKey(mission)] ?? {}
  const team = teamOf(m.team)
  if (!team.every((uid) => typeof cards[uid] === 'boolean')) return null
  const fails = team.filter((uid) => cards[uid] === false && sideOf(secret.roles?.[uid]) === 'spijuni').length
  const needed = failsNeeded(playerOrder(pub).length, mission)
  return { team: m.team ?? {}, fails, needed, ok: fails < needed }
}

export function applyMission(pub: Pub, result: MissionResult): Pub {
  const m = misijaOf(pub)
  return { ...pub, misija: { ...m, results: { ...(m.results ?? {}), [mKey(missionNo(pub))]: result } } }
}

function finish(pub: Pub, winner: Side, extra: Partial<MisijaState> = {}): Pub {
  const m = misijaOf(pub)
  const tally = { ...(m.tally ?? {}), [winner]: (m.tally?.[winner] ?? 0) + 1 }
  return { ...pub, phase: 'over', misija: { ...m, ...extra, winner, tally } }
}

/** After the mission reveal: the next mission, the spies' shot at the Vidovnjak, or the end. */
export function afterReveal(pub: Pub): Pub {
  const w = wins(pub)
  const m = misijaOf(pub)
  if (w.spijuni >= TO_WIN) return finish(pub, 'spijuni')
  if (w.ekipa >= TO_WIN) return specialsIn(pub) >= 1 ? { ...pub, phase: 'guess' } : finish(pub, 'ekipa')
  return {
    ...pub,
    phase: 'team',
    round: pub.round + 1,
    misija: { ...m, team: undefined, votes: undefined, played: undefined, lastVote: undefined, turn: (m.turn ?? 0) + 1, rejects: 0 },
  }
}

/** The spies name who they think is the Vidovnjak; right steals the win. */
export function shoot(pub: Pub, target: string, roles: Record<string, Role>): Pub {
  return finish(pub, roles[target] === 'menadzer' ? 'spijuni' : 'ekipa', { shot: target })
}

export function resetMisijaLobby(pub: Pub): Pub {
  const m = misijaOf(pub)
  return { ...pub, phase: 'lobby', round: 0, misija: { specials: m.specials ?? 0, tally: m.tally } }
}

/** Results as a list for the track at the top, with empty slots for missions still to come. */
export function track(pub: Pub): (MissionResult | null)[] {
  const results = misijaOf(pub).results ?? {}
  return Array.from({ length: MISSIONS }, (_, i) => results[mKey(i + 1)] ?? null)
}
