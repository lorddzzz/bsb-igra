# Agent guidance

Working instructions for this repository. Procedures are skills in `.claude/skills/` (also visible to Codex via `.agents/skills`): `design-round`, `implement-design`, `add-game`, `verify-change`, `verify-ui`. Read the relevant skill before applying it. [The workflow guide](docs/AGENT_WORKFLOW.md) is being migrated into them.

## Project

- Družina is one React + TypeScript + Vite PWA with party games for groups of friends on their phones. It will keep growing: more games, grouped into collections for different friend groups. Player-facing text is Serbian Latin (latinica, with diacritics) and keeps the comic-book hero HQ tone; no Backstreet Boys content.
- Players are trusted friends; preventing deliberate cheating is out of scope.
- [README.md](README.md) describes the app. [BACKLOG.md](BACKLOG.md) holds decisions and proposals, and [docs/REPOSITORY_REVIEW.md](docs/REPOSITORY_REVIEW.md) holds maintenance recommendations. Respect their statuses: an unreviewed suggestion is not an approved requirement.

## Code structure

- Per game, `src/<game>/`: `logic.ts` (rules), `room.ts` (moves to shared state), `types.ts`; the screen is `src/screens/<Game>.tsx`. Shared: `src/game/` (room and types), `src/backend/`, `src/history/`, `src/ui/`. Content lives in `src/data/`.
- Keep rules independent of React, browser APIs and the database. Pass randomness and clocks in so tests are repeatable.
- Firebase drops empty containers and returns different shapes than in-memory objects. Normalize at the boundary and reuse the helpers in `src/test/` (`firebaseShape.ts`, `sims.ts`, `phones.ts`).
- Adding a game touches: `GameId` in `src/game/types.ts`, `src/games.ts`, routing and rules text in `src/App.tsx`, the game's state in the shared room state, `src/history/logic.ts` for the scoreboard, a simulation in `src/test/sims.ts`, an `e2e/<game>.mjs` script listed in `e2e/all.sh`, and `database.rules.json` if it has private or hidden data. Copy the closest existing game (`src/wave/` is the smallest).

## Verification

- `npm ci` for setup. `npm run dev`, then `?local` (browser-tab simulation) or `?emu` (Firebase emulators). A plain URL connects to live Firebase, even in dev; never use it for verification or touch live data unless the task requires it.
- Before committing or reporting completion of app changes: `npm run lint`, `npm test`, `npm run build` (includes type checking).
- Also run `npm run test:rules` for database-rule changes (needs Java) and `npm run e2e` when full-game flows change (Unix shell, Chromium, ~8 min).
- Prose-only changes: check links and commands against their definitions, and `git diff --check`.
- Behavior changes need tests at the affected layer: rule and scenario tests, multi-phone simulations. Do not mirror the implementation.
- UI changes need a real browser check at phone size with an inspected screenshot; see [the verification procedure](docs/AGENT_WORKFLOW.md#verification).
- Do the mechanical verification yourself. Owner playtests are for feel, UX and direction. Report what ran, what failed, and what could not run.

## Git and delivery

- Default: commit straight to `main`. If that is not possible, use a short branch, open a PR, merge it, and delete the branch, so history reads as if it was done on `main`.
- Parallel or longer-lived work gets its own branch named by change type (`feat/…`, `fix/…`, `chore/…`, `docs/…`). A branch given in the task wins.
- Stage explicit paths. Short descriptive commit messages, optionally with those prefixes.
- A push to `main` deploys to GitHub Pages. Only lint, unit tests and build gate it; e2e and rules run separately and do not. Frontend deploys do not publish database rules.
- After pushing, check CI and deployment for that commit, not the latest run. Clean up only branches and worktrees you created, and only once their work is integrated.
- If work is unfinished, hand over the outcome, verification, decisions, and the exact next step. For larger work, keep a short plan and status in `docs/plans/`.
