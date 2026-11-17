# Tiha misija status
Plan: [tiha-misija-plan.md](tiha-misija-plan.md). Updated: 2026-11-17. Usage when written: unknown.
State: complete, waiting on the owner's playtest
Next: playtest on two real phones; tune the values under "Tune in playtest" in the plan.

## Tasks
| ID | Scope / role / model / effort | Size | State | Branch / commit / files | Verification / remaining |
| --- | --- | --- | --- | --- | --- |
| C | Contract: types, phases, GameId / orchestrator | S | done | `src/tiha/types.ts`, `src/game/types.ts` | `tsc -b` clean |
| A | Rules, room actions, tests / Medium / Sonnet | M | done | `src/tiha/logic.ts`, `logic.test.ts`, `room.ts` | 50 rule tests |
| I | Catalog, history, music, README / Fast / Haiku | S | done | `src/games.ts`, `src/history/`, `src/ui/music.ts`, `README.md` | history tests; the track has not been listened to |
| S | Screen, rules text, styles, sim, screen tests / Medium / Sonnet | L | done | `src/screens/Tiha.tsx`, `src/screens/rules/Tiha.tsx`, `src/gameScreens.ts`, `src/test/sims*` | screen tests; browser check at 375x667 and 390x844 in `?local` |
| E | Room test, e2e script, emulator flow / Medium / Sonnet | M | done | `e2e/tiha.mjs`, `e2e/all.sh`, `scripts/e2e-emu.mjs`, `src/test/games.room.test.ts` | `node e2e/tiha.mjs` at both sizes; `E2E_GAME=tiha npm run test:e2e:emu` |
| R | Independent review / Medium / Sonnet | S | done | whole diff | no rule bugs; four findings fixed (below) |

## Decisions and unresolved proposals
- Hands live in `pub` like Licitacija's bids (trusted friends); no database-rule change. Accepted as the plan's stated assumption.
- Scoreboard title sums completed missions instead of showing the best run, because titles only sum. Needs the owner's nod.
- Count tasks ask for 2 to 5 tricks (the contract said 0 to 4): the review showed that 0 is unwinnable and 1 nearly so, because the owner always holds another task. Tunable.
- Review fixes: partner's signal greys out once its card is played; a failed task pick is caught; recent games show completed missions for a co-operative run.
- `TIHA MISIJA` contains `MISIJA`, so `src/App.test.tsx` and `e2e/misija.mjs` now pick Misija with `/(?<!TIHA )MISIJA/`.

## Integration risks and follow-ups
- Difficulty: with random play the win rate is about 49% at level 1, 23% at level 2, 11% at levels 3 and 4, and about 1% from level 5. Real players coordinate, so this is only a floor, but the curve from level 5 may be too steep. Playtest.
- About 30% of "win this card" tasks concern a card lower than every card the partner holds in that colour, so they need the partner to run out of the colour or the right owner to be picked in the draft.
- Either phone can leave the result screen for both players. Playtest whether that feels abrupt.
- A run counts as a game without a win in the overall table.
- Not checked: sound of the track, installed PWA, Safari, real-network sync.
