# Čiji je ovo odgovor? — design

Status: **implemented 2026-10-31** (design agreed the same day). Game id and folder: `cija`; `src/cija/`, `src/screens/Cija.tsx`, `src/data/cijaPrompts.ts`, `e2e/cija.mjs`. Player-facing name: **ČIJE JE OVO?** (working title). Needs the owner's playtest for feel, pacing and fun; see "Tune in playtest".

## Goal

3 to 8 players. Everyone anonymously answers a personal prompt ("Najčudnija stvar koju sam jeo/la"). The answers are shown shuffled and everyone tries to match each answer to the friend who wrote it. Players learn odd facts about each other; points reward knowing people and writing answers that are interesting but not instantly obvious. Most points after the last round wins.

## Decided (owner, 2026-10-31)

| Question | Decision |
| --- | --- |
| Prompt source | Built-in list in `src/data/`, tagged by intensity **lagano / srednje / ljuto**. The host picks the intensity in the lobby before starting. |
| Guess flow | **Match-up board**: all answers on one screen, each player assigns a name to every answer but their own, submits once, then one reveal. |
| Scoring | **Guess + fool, capped** (below). |
| Length | **3 prompts** by default; the host can change it to 2 to 5. |

## Flow

1. **Lobby.** Host sets intensity and number of prompts. 3 to 8 players.
2. **Answer** (per round). Everyone sees the same prompt and writes a short answer privately. The round moves on when everyone has submitted.
3. **Match-up.** The N answers are shown in a shuffled order that is the same for everyone. Your own answer is marked "tvoj" and locked, so you assign names to the other N-1 answers from the other N-1 players. Each name is used once (a true matching; picking a name already used moves it). Submit once; wait for the others.
4. **Reveal.** Authors are shown with who guessed right, plus the round's points. Then the next prompt, or the final standings.
5. **End.** Final scoreboard, winner, fun titles; the game is saved to the all-time scoreboard.

## Scoring (per round)

- **Guesser:** +1 for each answer assigned to the correct author.
- **Author:** +1 for each guesser who got the author wrong, capped at floor((N-1)/2) per answer. Example: 5 players, 4 guessers, 2 guess you, 2 don't: +2 (the cap is 2).
- Ties on total points share the win, as in the other games.

Example, 3 players: each answer has 2 guessers, so the author cap is 1.

## Secret and public

Built like Blef: every player's answer lives in `pub` (`pub/cija/answers/{uid}`), because the app trusts friends and does not defend against someone reading the database on purpose. The screens never show authorship before the reveal: the board is shuffled and the match-up shows only letters. Guesses are public data too.

This replaces the earlier proposal to hide answers with database rules. **No database-rule change was made and `rules/rules.test.mjs` is untouched.** If the owner wants answers hidden at the database level, that is a separate decision: it needs a claim step where each phone publishes its own answer id after the match-up.

## Edge cases and assumptions (proposals, not agreed)

- **Empty or duplicate answers.** Block empty answers. If two answers are identical, the second gets a marker added so they stay distinguishable. Cap the length (about 60 characters).
- **A player leaves or stalls.** Follows the shared policy: absent players are never removed and their secret moves are never invented. Built as: the round waits for them (no "Ne čekaj ostale" button, unlike Blef), and the host can still use shared host takeover. Whether the host should be able to skip a stalled round is still an open question for the owner.
- **Invalid matchings.** The match-up UI prevents a name being used twice, but the logic must still reject a submission that is incomplete, uses a name twice, or assigns the player's own answer.
- **3 players are easy.** After seeing your own answer, only a coin flip remains. Accepted; the fooling cap keeps the score balanced. Check in playtest.
- **Obvious answers.** Rewarding the author only for fooled guessers (with the cap) is the guard against dull, obvious answers; the cap is the guard against unguessable ones.
- **Runaway leader.** Scores per round are small and bounded; three rounds limit snowballing. Check in playtest.

## Tune in playtest

Answer length cap (60), default of 3 rounds, the fooling cap fraction, any timer (none planned; a timer would be a new decision), and whether the all-at-once reveal is dramatic enough (a per-answer reveal was the alternative).

## Content

About 60 prompts in Serbian Latin (latinica, with diacritics) in `src/data/`, tagged `lagano` / `srednje` / `ljuto` (about 20 each), in the comic-book hero HQ tone, no Backstreet Boys content. The game needs a "seen" list per room like Blef so a rematch does not repeat prompts. Content must be checked in `src/data/data.test.ts` (Latin script, no stray whitespace, unique ids). Only this game's own screen and logic may import the content.

## Scoreboard

Add to `SCORED` in `src/history/logic.ts`. Proposed fun stats: "najviše pogođenih" (most correct guesses), "misteriozni" (most fooled guessers). Both are proposals.

## Acceptance criteria

- Rules in `src/cija/logic.ts` are pure and tested at boundaries: 3 and 8 players, the fooling cap, ties, invalid matchings.
- A multi-phone simulation in `src/test/sims.ts` plays whole games with bots, with Firebase's data shape between steps.
- Room-action tests cover double taps and lag; answers and guesses stay hidden until the reveal (database rules and `rules/rules.test.mjs`).
- Every screen renders in every state, and `e2e/cija.mjs` plays a whole game and is added to `e2e/all.sh` and `scripts/e2e-emu.mjs`.
- UI checked at 375×667 and 390×844, including 8 players (8 answers on one screen) and long answers.
- The owner's playtest covers feel, pacing and fun.

## Out of scope

Player-written prompts, a timer, per-answer sequential reveal, group collections (BACKLOG B01), and any change to the shared room model.

## Decisions made while building (proposals; tune or reverse after a playtest)

- Game id `cija`, placed last on the home screen; background track "Šaputanje".
- The match-up board is tap an answer, then tap a friend. It moves to the next open answer by itself, a friend moved to another answer is taken off the first, and the last answer is filled in when only one way is left.
- The board is keyed by its order, so a reshuffled board starts again on its first answer (only seen when two phones close the writing step at the same moment).
- Equal answers get a number added to the later one ("pica", "pica (2)").
- Scoreboard stats: `guessed` (right matches) and `fooled` (capped fooled guessers), with titles "Čita drugare" and "Čovek misterija".
- Copy avoids gendered verbs for the players themselves ("Autor", "Čiji je odgovor A?"). Prompts use "/la" forms.
- No timer, no per-answer reveal, no player-written prompts (all out of scope as planned).
