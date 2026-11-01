# Agent guidance

Working instructions for this repository. Procedures are skills in [.claude/skills/](.claude/skills/) (also visible to Codex via `.agents/skills`): `design-round`, `implement-design`, `add-game`, `verify-change`, `verify-ui`. Read the relevant skill before applying it.

## Project

- Družina is one React + TypeScript + Vite PWA with party games for groups of friends on their phones. It will keep growing: more games, grouped into collections for different friend groups. Player-facing text is Serbian Latin (latinica, with diacritics) and keeps the comic-book hero HQ tone; no Backstreet Boys content.
- Players are trusted friends; preventing deliberate cheating is out of scope.
- [README.md](README.md) describes the app. [BACKLOG.md](BACKLOG.md) holds decisions, proposals, and remaining maintenance recommendations. Respect their statuses: an unreviewed suggestion is not an approved requirement.
- Keep the backlog focused on future work: remove completed, rejected, deferred, or dropped tasks; trim partly completed items to their remaining scope. Record past outcomes in Git history or relevant technical documentation, not as backlog tasks. Preserve existing item IDs.

## Code structure

- Per game, `src/<game>/` named after its game id (`uljez`, `blef`, `talas`, `kviz`, `licitacija`, `misija`, `cija`): `logic.ts` (rules), `room.ts` (moves to shared state), `types.ts`; the screen is `src/screens/<Game>.tsx`. Shared: `src/game/` (`room.ts` create/join/subscribe, `types.ts` the shared room state, `util.ts` helpers every game uses: `asList`, `shuffle`, `playerOrder`, `addStats`...; nothing game-specific belongs there), `src/backend/`, `src/history/`, `src/ui/`. Content lives in `src/data/`. Only a game's own screens, rules and logic may import its content; anything the shell imports (`App.tsx`, `src/ui/`, `src/game/`, `src/history/`) must not, or the content lands in every visitor's first download. Rules text is `src/screens/rules/<Game>.tsx`.
- Keep rules independent of React, browser APIs and the database. Pass randomness and clocks in so tests are repeatable.
- Firebase drops empty containers and returns different shapes than in-memory objects. Normalize at the boundary and reuse the helpers in `src/test/` (`firebaseShape.ts`, `sims.ts`, `phones.ts`).
- Game join capacity and badge choices belong in `src/games.ts`; keep shared joining free of game-specific branches. New rooms carry `protocol` from `src/game/compatibility.ts`; missing means legacy protocol 1. Bump only for incompatible room/move changes, preserve it through resets, and keep unknown/incompatible rooms out of game hooks. Shared recovery never removes absent players or invents their moves.
- Adding a game touches: `GameId` in `src/game/types.ts`, `src/games.ts`, its entry in `src/gameScreens.ts` (lazy screen and rules, so the first download does not grow with every game), the game's state in the shared room state, `src/history/logic.ts` for the scoreboard, a simulation in `src/test/sims.ts`, an `e2e/<game>.mjs` script listed in `e2e/all.sh`, and `database.rules.json` if it has private or hidden data. Copy the closest existing game (`src/talas/` is the smallest).

## Verification

- `npm ci` for setup. `npm run dev`, then `?local` (browser-tab simulation) or `?emu` (Firebase emulators). A plain URL connects to live Firebase, even in dev; never use it for verification or touch live data unless the task requires it.
- Before committing or reporting completion of app changes: `npm run lint`, `npm test`, `npm run build` (includes type checking).
- Also run `npm run test:rules` for database-rule changes (needs Java) and `npm run e2e` when full-game flows change (Unix shell, Chromium, ~8 min).
- Prose-only changes: check links and commands against their definitions, and `git diff --check`.
- Behavior changes need tests at the affected layer: rule and scenario tests, multi-phone simulations. Do not mirror the implementation.
- UI changes need a real browser check at phone size with an inspected screenshot; see [verify-ui](.claude/skills/verify-ui/SKILL.md).
- Changed a main screen, shared UI, a label or a game clock? Read [What breaks CI when you change things](#what-breaks-ci-when-you-change-things) and run the matching `e2e/<game>.mjs` (or `npm run e2e`) before pushing; CI e2e does not gate deploy but red runs must not be left.
- Do the mechanical verification yourself. Owner playtests are for feel, UX and direction. Report what ran, what failed, and what could not run.

## What breaks CI when you change things

The "Full checks" workflow (`.github/workflows/checks.yml`) runs after every push to `main`: every game's `e2e/<game>.mjs` on simulated phones (at 390x844 and again at 375x667), plus the same flows on the Firebase emulator (`scripts/e2e-emu.mjs`), plus the database rules. It does not gate the deploy, so a red run is easy to miss. Check it for your commit before reporting done, and run the affected scripts locally first.

- **Main screens and shared UI** (`App.tsx`, `src/screens/shared.tsx`, `src/ui/`, home, lobby, header, scoreboard): every e2e script drives them by role, label, placeholder, text and CSS class (`radio` of the game name, `Napravi sobu`, `Uđi u sobu`, `Počni igru`, `Nova igra`, `.code-chip`, `.badge-pick`, `.logo`, `Družina (N)`, `.winner`, `.standings`). Renaming, restyling to another element, or changing such a label means updating `e2e/session.mjs`, `e2e/phone.mjs` and every `e2e/*.mjs` that uses it (`grep -rn '<old text>' e2e scripts src/**/*.test.tsx`), `scripts/e2e-emu.mjs`, and the screen tests (`src/App.test.tsx`, `src/screens/*.test.tsx`).
- **A game screen or its text/classes**: update that game's `e2e/<game>.mjs`, `src/screens/<Game>.test.tsx` and `src/screens/screens.test.tsx`. The e2e probe also fails on horizontal overflow, clipped text and tap targets under about 44px at both phone sizes, so a layout change needs the 375x667 run too (`WIDTH=375 HEIGHT=667`).
- **Timings** (lead-ins, splashes, reveal pauses, timers in `src/<game>/logic.ts`): e2e scripts wait for the result of these clocks with timeouts. Waits must cover the longest chain (for example Kviz reveal 4 s + splash 3 s) several times over, because CI emulator runs are far slower than a laptop. When you lengthen a clock, grep the e2e scripts for the `waitFor` timeouts that depend on it. Never shorten a wait to speed the run up; fix a flaky wait by waiting for the state, or with a generous timeout, never by retrying blindly.
- **Adding or changing a game, `GameId`, `src/games.ts`**: `src/games.test.ts`, `src/history/logic.test.ts`, `src/test/sims.ts`, `e2e/all.sh`, and the game list in `scripts/e2e-emu.mjs`.
- **Database shape, `database.rules.json`, `protocol`**: `npm run test:rules`, the emulator e2e (`npm run test:e2e:emu`, needs Java and Firebase tools) and the shapes in `src/test/firebaseShape.ts`.
- **Console errors fail e2e scripts** (except known offline noise). A new `console.error`/uncaught error on any screen turns the run red.
- A failure in `emulator-e2e` often passes locally in `?local` mode. Reproduce with `npm run test:e2e:emu`, read the job log (`get_job_logs`) and the uploaded `emulator-screenshots` artifact before guessing.

## Git and delivery

- Default: commit straight to `main`. If that is not possible, use a short branch, open a PR, merge it, and delete the branch, so history reads as if it was done on `main`.
- Parallel or longer-lived work gets its own branch named by change type (`feat/…`, `fix/…`, `chore/…`, `docs/…`). A branch given in the task wins.
- Stage explicit paths. Short descriptive commit messages, optionally with those prefixes.
- A push to `main` deploys to GitHub Pages. Only lint, unit tests and build gate it; e2e and rules run separately and do not. Frontend deploys do not publish database rules.
- After pushing, check CI and deployment for that commit, not the latest run. Clean up only branches and worktrees you created, and only once their work is integrated.
- If work is unfinished, hand over the outcome, verification, decisions, and the exact next step. For larger work, keep a short plan and status in `docs/plans/`.
