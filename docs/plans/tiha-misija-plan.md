# Tiha misija — design

Status: **implemented 2026-11-17** (design agreed the same day; build record in [status](tiha-misija-status.md)). Needs the owner's playtest for feel, pacing and difficulty. The four decisions below are the owner's; everything under "Assumptions" and "Tune in playtest" is a proposal until the owner confirms or the playtest says otherwise. Proposed game id and folder: `tiha` (`misija` is taken). Player-facing name: **TIHA MISIJA**.

Built for two people on a couch on a quiet night: played only on the phones, without talking.

## Goal

Exactly 2 players, co-operative. The two play a trick-taking card game (štihovi) as one team against the mission. Each mission has tasks such as "osvoji zelenu 7"; the team wins the mission when every task is fulfilled and loses it the moment one becomes impossible. Missions get harder through the evening. The team has 3 lives; the run's result is the highest mission reached.

## Decided (owner, 2026-11-17)

| Question | Decision |
| --- | --- |
| Deal | **Two hands plus hidden cards.** Each player gets a hand; a few cards stay face-down and out of play, so nobody knows for sure where a missing card is. |
| Signals | **One signal per mission per player.** Reveal one card from your hand with a marker: highest, lowest, or only card of that colour. No other communication. |
| Progression | **Nightly run with lives.** Every run starts at mission 1. A failed mission costs a life and is replaced by a new mission of the same level. Missions are generated, not hand-written. |
| Tasks | **Take turns picking.** After the deal, the mission's tasks are shown to both and the players alternate choosing one each until all are taken. |

## Flow

1. **Lobby.** Exactly 2 players. No settings.
2. **Deal.** Each player sees their own hand. The captain (kapetan) alternates every mission.
3. **Task draft.** All tasks are visible to both. Starting with the captain, players alternate taking one task. Taken tasks stay visible to both for the whole mission.
4. **Tricks.** The captain leads the first trick. The other player must follow the led colour if they can; otherwise they may play anything. The higher card of the led colour wins, unless a trump (adut) was played, which beats any colour. The trick's winner leads the next one.
5. **Signal.** Before leading or answering a trick, a player who has not yet signalled this mission may reveal one non-trump card with a marker (najviša / najniža / jedina of that colour). The card stays in their hand, visible to the partner.
6. **Mission end.** Success as soon as all tasks are fulfilled; failure as soon as one is broken or can no longer be met. Both see the result and what went wrong. Either player continues.
7. **Run end.** At 0 lives: the screen shows the mission reached, and the run is saved to the scoreboard.

## Tasks

A task belongs to the player who took it. Types, introduced as the level rises:

- **Win a card**: "osvoji zelenu 7" — the owner must win the trick containing that card. Only cards actually dealt to a hand are used, never hidden ones.
- **Order**: a task marked "prvi" or "poslednji" among the mission's card tasks.
- **Trick count**: "osvoji tačno 2 štiha", "ne osvoji nijedan štih".
- **Last trick**: "osvoji poslednji štih".

## Secret and public

A hand is visible only to its owner. Hidden cards are visible to nobody until the mission ends. Tasks, played tricks, signals, lives and the mission number are public.

## Assumptions (proposals)

- All of these were built as proposed.
- **Deck**: 4 colours × 1–7 plus 3 trumps = 31 cards; 12 per hand, 7 hidden.
- **Theme**: colours and trumps get comic-book HQ names; trumps are "super" cards.
- **Signal restrictions**: trumps cannot be signalled; a signal must be true when given.
- **No timers.** Turn-based; the game waits.
- **Hand privacy**: follow whatever Licitacija does for secret bids (trusted friends; a database rule only if that game already uses one).
- **No upper mission limit.** Difficulty keeps rising by adding tasks and harder task types.

## Edge cases

- **A player leaves or stalls.** Shared policy: the game waits, no moves are invented. With one of two players gone the run cannot continue; it is not saved unless it reached its end.
- **Impossible deals.** Generated missions can be unwinnable with the cards dealt. Lives absorb this; the generator should avoid plainly impossible tasks (e.g. a "win" task for a card that the lowest holder cannot ever win is still allowed, but contradictory tasks are not).
- **Task on your partner's card.** Allowed and intended: you must win a trick she plays that card into.
- **Invalid moves.** The logic rejects playing out of turn, not following colour when able, a second signal, a false signal, and drafting out of turn.

## What could be unfun

- **Luck**: hidden cards plus two-card tricks may make hard missions feel random. Watch in playtest; the hidden-card count is the main dial.
- **One player deciding everything**: the alternating captain and task draft are meant to prevent this.
- **Too easy early**: missions 1–3 may be trivial; consider starting the difficulty curve steeper.

## Tune in playtest

Deck size and hidden-card count, hand size (round length; target 3–4 minutes a mission), number of lives (3), the difficulty curve (tasks per level and when each task type appears), whether a failed mission should end immediately or let the hand play out.

## Scoreboard

Co-operative: no winner. Built: a finished run is saved with the missions completed for both players; the all-time title "Tihi tandem" (`tiha.missions`) sums completed missions over all runs, because titles only sum (the proposal was the best single run). Recent games show "Uspešnih misija: N". A run counts as a played game without a win in the overall table, which slightly lowers both players' win rate there; open to change.

## Acceptance

- Rule tests: following colour, trump beats colour, trick winner leads, every task type fulfilled and failed, early failure detection, signal validity and one-per-mission limit, draft order, lives and run end, mission generation uses only dealt cards and never contradictory tasks (seeded randomness).
- A simulation in `src/test/sims.ts` and `e2e/tiha.mjs` playing one mission to success and one run to 0 lives.
- Phone-size screen check of hand, task draft, trick and result views.

## Out of scope

More than 2 players, saved campaign progress between evenings, hand-written mission ladders, chat or emoji, timers.

## Implementation contract

State and card encoding: `src/tiha/types.ts` (authoritative). Everything is in `pub.tiha`; no tickets, no database-rule change. Phases: `lobby → draft → play → result → draft | over`. `pub.round` counts deals from 1.

`src/tiha/logic.ts` exports (pure; `Rng` from `src/game/util.ts`; every transition returns `undefined` when the move is not allowed, so double taps are harmless):

```ts
export const TIHA_PLAYERS = 2
export const COLORS: TihaSuit[]            // ['r','g','b','y']
export const COLOR_MAX = 7; export const TRUMPS = 3; export const HAND_SIZE = 12; export const START_LIVES = 3
export const DECK: TihaCard[]              // 31 cards
export function tihaOf(pub: Pub): TihaState            // pub.tiha ?? {}
export function pair(pub: Pub): string[]               // the two players, join order
export function partnerOf(pub: Pub, uid: string): string | undefined
export function suitOf(card: TihaCard): TihaSuit
export function rankOf(card: TihaCard): number
export function handOf(pub: Pub, uid: string): TihaCard[]      // sorted by colour (r,g,b,y,a) then rank
export function tasksOf(pub: Pub): TihaTask[]                  // asList
export function tableOf(pub: Pub): TihaPlay[]                  // asList
export function playable(pub: Pub, uid: string): TihaCard[]    // [] unless phase 'play' and uid's turn; follows the led colour when possible
export function trickWinner(cards: TihaPlay[]): string         // 2 cards, lead first
export function marksFor(pub: Pub, uid: string, card: TihaCard): TihaMark[]  // truthful marks; [] for trumps, cards not in hand, or after uid signalled
export function generateTasks(level: number, hands: Record<string, TihaCard[]>, rng: Rng): TihaTask[]
export function startTiha(pub: Pub, rng: Rng): Pub | undefined         // from lobby or over: level 1, lives 3, cleared 0, round 1, deal → 'draft'
export function takeTask(pub: Pub, uid: string, taskId: number): Pub | undefined   // 'draft'; last task taken → 'play', turn = captain
export function signal(pub: Pub, uid: string, card: TihaCard, mark: TihaMark): Pub | undefined  // 'play', only on uid's turn
export function playCard(pub: Pub, uid: string, card: TihaCard): Pub | undefined   // resolves the trick, tasks and the mission end in the same step
export function nextTiha(pub: Pub, rng: Rng): Pub | undefined          // 'result' → new deal ('draft', round+1) or 'over' when lives are 0
export function resetTihaLobby(pub: Pub): Pub                          // keeps protocol, game, hostUid, players
```

Rules fixed for the build:

- **Deal**: shuffle `DECK`, 12 to each player, 7 hidden. Captain: first deal of a run is `pair(pub)[0]`, then alternates every deal.
- **Draft**: captain picks first, then alternate; with an odd task count the captain gets one more.
- **Trick**: follower must follow the led colour (trump is its own colour) if able. Highest trump wins, else highest card of the led colour. Winner leads.
- **Task resolution after each trick**: a 'win' task is done when its owner wins the trick with its card and failed when the partner does; `order: 'first'` fails if another 'win' task is done earlier, `order: 'last'` fails if it is done while another 'win' task is still open. A 'count' task fails as soon as the owner has more than `n` tricks or cannot reach `n` any more, and is done only after trick 12. A 'last' task resolves on trick 12.
- **Mission end**: any failed task → `result` with `outcome: 'lost'`, `failedTask`, `lives - 1`. All tasks done → `result`, `outcome: 'won'`, `cleared + 1`. The hand does not play out after either.
- **Next**: after 'won', `level + 1`; after 'lost' the same level; lives 0 → `over` (keep `cleared`, `level`).
- **Generation**: tasks by level: 1 → 1 win; 2 → 2 wins; 3 → 2 wins, one with an order; 4 → 3 wins; 5 → 3 wins + 1 count; 6 → 3 wins (one ordered) + last; 7+ → 4 wins (cap 5 at level 10+) with one order, plus a count or a last. Win cards are distinct, non-trump, taken only from the two hands. At most one 'first' and one 'last' order, at most one 'count' (n from 2–5; lower values are unwinnable or nearly so, because the task's owner always holds another task too) and one 'last' kind per mission.
- **Scoreboard**: `summarize` saves a run at `over` with both players' `stats: { missions: cleared }`; title "Tihi tandem" on `tiha.missions` (summed over runs like the other titles, a change from the "best run" proposal because titles only sum).
