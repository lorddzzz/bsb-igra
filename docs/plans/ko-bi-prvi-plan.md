# Ko bi prvi? — design

Status: **design agreed 2026-11-01**, not implemented. Proposed game id and folder: `prvi`; `src/prvi/`, `src/screens/Prvi.tsx`, `src/data/prviPrompts.ts`, `e2e/prvi.mjs`. Player-facing name: **KO BI PRVI?** Built for a late, relaxed night: no hard thinking, one tap per round, loud reveals.

## Goal

3 to 12 players. Each round shows a prompt like "Ko bi prvi zaspao na žurci?" and everyone secretly votes for the player who fits it best. All votes are revealed at once, showing who voted for whom. Voting with the majority earns a point, and whoever gets the most votes takes that prompt's title for the night ("Kralj kauča"). After 10 prompts, most points wins.

## Decided (owner, 2026-11-01)

| Question | Decision |
| --- | --- |
| Self-vote | **Allowed.** Every player, including you, is on the ballot. |
| Scoring | **Vote with the majority**: +1 if you voted for a player with the most votes. The chosen player gets the title, not points. |
| Reveal | **Named**: each player is shown with who voted for them. |
| Length | **Fixed 10 prompts.** No length setting in the lobby. |

## Flow

1. **Lobby.** The host picks the spice level (`lagano` / `srednje` / `ljuto`, as in Čije je ovo). 3 to 12 players.
2. **Vote** (per round). Everyone sees the same prompt and a list of all players' names, taps one and confirms. You can change your vote until you confirm, but not after. The screen shows how many players have voted, not who they voted for.
3. **Reveal.** Once the last vote is in, players are listed by votes received, most first, each with the names of their voters. The top player(s) get the prompt's title, and the round's points are shown. The host moves to the next prompt.
4. **End.** After prompt 10: final standings, winner(s), and each player's collected titles. The game is saved to the all-time scoreboard.

## Scoring (per round)

- Let *top* be the highest vote count among the players. Every voter whose pick received *top* votes gets **+1**. With a tie for the most votes, voters for every tied player score.
- Being voted for gives no points; the title is the reward.
- A tie on total points at the end shares the win, as in the other games.

Example, 5 players: 3 vote Marko and 2 vote Ana, so the three Marko voters get +1 and Marko gets the title. With 2–2–1, the four voters for the two tied leaders score and both leaders share the title.

## Secret and public

Votes live in `pub` like Blef and Čije je ovo answers; the app trusts friends. The screens never show a vote before the reveal. No database-rule change is planned.

## Edge cases and assumptions (proposals, not agreed)

- **Everyone votes for a different player** (every count is 1). Proposal: nobody scores and nobody gets the title ("Ekipa se ne slaže!"). The rule as stated would give everyone +1, which rewards a non-majority.
- **A player leaves or stalls.** Shared policy: absent players stay and their votes are never invented. The round waits, and host takeover remains available. Absent players still appear on the ballot.
- **Invalid votes.** The logic rejects votes for a uid not in the room, a second vote from the same player after they confirm, or a vote outside the voting phase.
- **3 players.** With self-votes allowed, three players have 3 choices each. A 1–1–1 split falls under the "every count is 1" rule above.
- **Runaway leader.** At most 1 point per round, over 10 rounds, so no one can get far ahead. Check in playtest.
- **Hurt feelings.** Named reveal plus a `ljuto` level can sting. Prompts stay playful and roast habits, not people; `ljuto` means more personal, not mean.

## Tune in playtest

10 rounds (fixed by decision, but easy to change), whether the reveal needs a short drumroll or staged animation, and whether the host or any player advances to the next prompt.

## Content

About 90 prompts in Serbian Latin (latinica, with diacritics) in `src/data/prviPrompts.ts`, about 30 per level, so a rematch at the same level still gets fresh prompts. Each prompt carries a short comic-book-hero title (e.g. `{ id, level, q: 'Ko bi prvi zaspao na žurci?', title: 'Kralj kauča' }`). Use gender-neutral or slash forms (zaspao/la) as in `cijaPrompts.ts`. Keep the HQ tone, no Backstreet Boys content. The room keeps a "seen" list like Blef and Čije je ovo. `src/data/data.test.ts` checks Latin script, no stray whitespace, unique ids, and at least 10 prompts per level. Only this game's own screen and logic may import the content.

## Scoreboard

Add `prvi` to `SCORED` in `src/history/logic.ts`. Proposed fun stats: "U glavi ekipe" (most majority votes) and "Zvezda večeri" (most titles won). Both are proposals.

## Acceptance

- Rule tests for scoring: clear majority, ties, every count 1, self-votes, invalid and duplicate votes.
- A multi-phone simulation in `src/test/sims.ts` and `e2e/prvi.mjs` (listed in `e2e/all.sh`) playing a full 10-prompt game.
- Lint, unit tests and build pass. A phone-size browser check of the vote, reveal (with 12 names) and end screens.

## Out of scope

Custom prompts typed by players, a timer, anonymous voting, a length setting, and points for being picked.
