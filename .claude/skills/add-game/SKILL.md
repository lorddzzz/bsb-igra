---
name: add-game
description: Checklist and workflow for adding a new party game to Družina (rules, room actions, screen, content, scoreboard, tests, e2e). Use when implementing a new game or porting a game idea into the app.
---

# Add a game

Družina is one app that keeps gaining games for different friend groups. A new game follows the shape of the existing ones; copy the closest one rather than inventing structure. `src/talas/` is the smallest; `src/licitacija/` is the one for two players; `src/misija/` for hidden roles. Folder, screen (`src/screens/<Name>.tsx`) and game id share one name.

Before coding: the rules and player count must be decided. If they are not, run the `design-round` skill first. For a multi-part build, use `implement-design`.

## 1. Find every touchpoint from a real example
Don't trust this list blindly; confirm with `grep -rniE "talas|wave" src e2e database.rules.json .github` and mirror each hit for the new game. Known touchpoints:

- `src/game/types.ts`: add to `GameId`, add the game's state type to `Pub` (`wave?: WaveState` (Talas keeps its original `wave` key in stored rooms)), and badges if it has them.
- `src/<game>/types.ts`, `logic.ts`, `room.ts`: state, rules, actions (below).
- `src/games.ts`: catalog entry (name, icon, tagline, player count text in Serbian, `maxPlayers` and `badges`). Shared joining reads this metadata; do not add game-specific branches to the room helper. Numeric capacity must match the game rules and fit the badge choices.
- `src/gameScreens.ts`: one entry with the lazy screen and rules (a `Record<GameId, ...>`, so a missing entry is a type error). Never import a game's screen, rules or content from the shell; they must stay separate downloads.
- `src/screens/<Game>.tsx`: the UI; reuse `src/screens/shared.tsx` and `src/ui/` pieces. `src/screens/rules/<Game>.tsx`: the "Kako se igra" text.
- `src/history/logic.ts`: scoreboard. Add to `SCORED` if it has winners and points, and a per-game stat or title if there is a fun one.
- Content in `src/data/` plus its checks in `src/data/data.test.ts` (Latin script, no stray whitespace, unique ids, answerable).
- Music: each game has its own background track in `src/ui/music.ts`.
- `database.rules.json` and `rules/rules.test.mjs`, only if the game has private per-player data or hidden answers.

## 2. Rules in `logic.ts`
Pure functions over state: no React, no browser APIs, no database. Pass `rng` and clocks in. Make every transition total and idempotent; players tap twice and phones lag. Enforce the player-count range in one place.

## 3. Room actions in `room.ts`
Phase changes go through `be.transaction` with the expected `from` phase and round, so double taps and simultaneous actions are harmless. Firebase drops empty arrays and objects and turns arrays into objects: read optional containers with a default. Private data (secret roles, hidden answers) goes in the player's private ticket (see `Ticket` and `useRoom` in `src/game/room.ts`), never in `pub`.

## 4. Screen
Mobile first, 375 px wide minimum. Every phase has a waiting state for players who are not acting. Text is Serbian Latin with correct diacritics, comic hero HQ tone, short sentences, no Backstreet Boys content. Rules text explains the goal in two or three lines.

## 5. Tests (all layers)
- `src/<game>/logic.test.ts`: rules and boundaries, fixed seeds.
- `src/test/sims.ts`: a `sim<Game>(seed, n)` that plays whole games with bots; add to `src/test/sims.test.ts` and `src/screens/screens.test.tsx` so every screen renders in every state.
- `src/test/games.room.test.ts`: room actions across several phones, including double taps and Firebase data shape.
- `e2e/<game>.mjs` modeled on `e2e/wave.mjs`, added to the `for game in` list in `e2e/all.sh`.
- Use `createPhoneSession` from `e2e/session.mjs` so the same flow supports `MODE=local` and `MODE=emu` with independent authenticated phones. Add it to `scripts/e2e-emu.mjs` too. Assert the game really ends; refresh/rejoin must preserve identity. For hidden data, verify own-ticket access and denied access to other tickets/secret before reveal.
- Details and conventions: the `implement-design` skill's `references/game-tests.md`.

## 6. Finish
Update README (game list, if the count or list is stated), BACKLOG status, and any docs that count games. Run the `verify-change` skill and `verify-ui` on each new screen at 375×667 and 390×844. Say in the report what needs a real-phone playtest: feel, pacing, whether it is fun.

Also run `npm run test:e2e:emu` (Java and Chromium required). Shared compatibility/recovery is inherited from the app shell: an unknown game or incompatible protocol never mounts its actions. A new game alone does not require a protocol bump; change `ROOM_PROTOCOL` only for incompatible room data/moves. Reset functions must preserve `protocol`, `game` and `hostUid`. Do not remove absent players or synthesize their votes/secret moves; shared recovery allows explicit host takeover but the group must wait/rejoin or start a new room if a required player cannot return.
