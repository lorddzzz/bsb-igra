# Tiha misija status
Plan: [tiha-misija-plan.md](tiha-misija-plan.md). Updated: 2026-11-17. Usage when written: unknown.
State: in progress
Next: integrate logic (A) and shell wiring (I), then screen (S), then e2e (E), then review.

## Tasks
| ID | Scope / role / model / effort | Size | State | Branch / commit / files | Verification / remaining |
| --- | --- | --- | --- | --- | --- |
| C | Contract: types, phases, GameId / orchestrator | S | done | `src/tiha/types.ts`, `src/game/types.ts` | typecheck fails until I and S land |
| A | Rules, room actions, tests / Medium / Sonnet | M | in progress | `src/tiha/logic.ts`, `logic.test.ts`, `room.ts` | `npx vitest run src/tiha` |
| I | Catalog, history, music, README / Fast / Haiku | S | in progress | `src/games.ts`, `src/history/`, `src/ui/music.ts`, `README.md` | history tests |
| S | Screen, rules text, styles, sim, screen tests / Medium / Sonnet | L | waiting on A | `src/screens/Tiha.tsx`, `src/screens/rules/Tiha.tsx`, `src/gameScreens.ts`, `src/test/sims*` | vitest, verify-ui |
| E | Room test, e2e script, emulator flow / Medium / Sonnet | M | waiting on S | `e2e/tiha.mjs`, `e2e/all.sh`, `scripts/e2e-emu.mjs`, `src/test/games.room.test.ts` | e2e local + emu |
| R | Independent review / Medium / Sonnet | S | waiting | whole diff | |

## Decisions and unresolved proposals
- Hands live in `pub` like Licitacija's bids (trusted friends); no database-rule change. Accepted by orchestrator as the plan's stated assumption.
- Scoreboard title sums completed missions instead of showing the best run, because titles only sum. Needs the owner's nod.

## Integration risks and follow-ups
- Generated missions may be unwinnable; lives absorb it. Playtest.
