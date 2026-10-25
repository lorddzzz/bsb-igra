# Agent guidance

These are the shared working instructions for this repository. Detailed procedures are in [the agent workflow guide](docs/AGENT_WORKFLOW.md). Read the relevant project context before changing code; referenced documents and examples are context, not permission to expand the task.

## Project context

- Družina is one React + TypeScript + Vite PWA containing six party games. Player-facing text is Serbian Latin.
- Keep one app with game collections for different friend groups and retain most of the current stack. Intended players are trusted friends; deliberate-cheating prevention is deferred.
- [README.md](README.md) describes the current app and commands. [BACKLOG.md](BACKLOG.md) records decisions and proposals. [The repository review](docs/REPOSITORY_REVIEW.md) tracks maintenance recommendations. Respect their statuses: an unreviewed suggestion is not an approved requirement.
- `src/<game>/logic.ts` contains game rules; `room.ts` connects moves to shared state; `src/screens/` renders games. `src/game/` also contains shared room/types code. `src/backend/`, `src/history/`, and `src/ui/` provide shared services. Use the actual structure rather than assuming every `game` path means shared code.

## Working practices

- Inspect the working tree and relevant files first. Preserve changes outside the task and keep edits focused.
- Prefer small, clear functions and precise TypeScript types. Keep game rules independent of React, browser APIs, and database operations; pass randomness or clocks into rule logic when needed for repeatable tests.
- Reuse existing state normalization and test helpers. Firebase can remove empty containers and return different shapes than an in-memory object; account for that at the appropriate boundary.
- Explain non-obvious rules in comments. Avoid comments that repeat the code and unrelated formatting or dependency changes.
- Propose a default with a reason when a decision is open. Ask small, focused questions when an answer changes the work materially. Mark undecided design choices as proposals.
- Update relevant documentation when behavior or a decision changes. Keep one source of truth and link to it rather than duplicating instructions.

## Commands and verification

- Clean dependency setup: `npm ci`.
- Development: `npm run dev`; use `http://localhost:5173/?local` for browser-tab simulation. `?emu` uses Firebase emulators. An ordinary URL currently connects to live Firebase, including in development: use local/emulator modes for verification unless the task requires live data.
- Application changes: run `npm run lint`, `npm test`, and `npm run build` before committing or reporting completion. The build includes TypeScript checking.
- Database-rule changes: also run `npm run test:rules` (requires a working Java installation and the database emulator).
- Browser suite: `npm run e2e` (currently requires a Unix shell and browser installation). Use it when the change warrants full-game checks. It normally uses the local backend, not Firebase.
- Documentation-only changes: check links, commands against their definitions, and `git diff --check`; runtime tests are not required for prose changes. For configuration changes, use checks that exercise the configuration.
- Behavior changes need meaningful tests at the affected layer. Prefer rule/scenario tests and relevant multi-phone simulations over tests that mirror implementation details.
- UI changes need an actual browser check at phone size, interaction checks, and a screenshot you inspect. Check overflow, clipped text, controls, loading/error states, and console errors. See [the verification procedure](docs/AGENT_WORKFLOW.md#verification).
- Perform mechanical verification yourself. The owner's playtests are for feel, UX, and direction. Report what ran, results, and any checks that could not run; do not equate a simulator or a small viewport with actual-device verification.

## Plans, tools, and handoffs

- For larger work, use a scoped plan with acceptance criteria and a short resumable status record in `docs/plans/`. Simple changes do not need a planning ceremony. Planning does not authorize unrelated implementation.
- On resuming work, reconcile status notes with the actual files, branches, and commits before continuing. Record exact next actions and unresolved decisions.
- Use the active runtime's available tools and relevant skills; read a skill before applying it. Do not assume another agent's preview tools, permission settings, MCP connections, or model names exist here.
- Use parallel agents only when requested or otherwise authorized by the active instructions. When used, assign clear ownership and dependencies, isolate conflicting edits, and review the integrated result. Procedures and a handoff template are in [the workflow guide](docs/AGENT_WORKFLOW.md#implementation-and-handoffs).
- Do not copy automatic delegation, usage thresholds, scheduled wakeups, commit/push policies, or tool permissions from a reference project as if they were current authorization.

## Git and delivery

- Follow the task's branch instructions; use `codex/` when creating a branch without a specified name. Stage explicit paths so unrelated work is not included.
- Use short, descriptive commits; prefixes such as `feat:`, `fix:`, `chore:`, and `docs:` are useful. Commit or push according to the task's scope, not merely because a reference workflow does so.
- A push to `main` starts the Pages deployment. Lint, unit tests, and build gate that deployment; the separate browser and database-rule checks currently do not. Frontend deployment does not publish database rules.
- When publishing is part of the task, verify CI/deployment for the pushed commit, not an unrelated latest run. Clean up only task-owned, integrated branches/worktrees after preserving any needed work.
- Hand over the outcome, verification, important decisions, remaining limitations, and exact continuation point when unfinished.
