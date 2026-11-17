# Tiha misija — design

Status: **design agreed 2026-11-17, not implemented.** The four decisions below are the owner's; everything under "Assumptions" and "Tune in playtest" is a proposal until the owner confirms or the playtest says otherwise. Proposed game id and folder: `tiha` (`misija` is taken). Player-facing name: **TIHA MISIJA**.

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

Co-operative: no winner. Proposed: save the mission reached for the pair, with an all-time title for the best run ("Tihi tandem", `tiha.best`). How a team result fits `src/history/logic.ts` is an implementation question.

## Acceptance

- Rule tests: following colour, trump beats colour, trick winner leads, every task type fulfilled and failed, early failure detection, signal validity and one-per-mission limit, draft order, lives and run end, mission generation uses only dealt cards and never contradictory tasks (seeded randomness).
- A simulation in `src/test/sims.ts` and `e2e/tiha.mjs` playing one mission to success and one run to 0 lives.
- Phone-size screen check of hand, task draft, trick and result views.

## Out of scope

More than 2 players, saved campaign progress between evenings, hand-written mission ladders, chat or emoji, timers.
