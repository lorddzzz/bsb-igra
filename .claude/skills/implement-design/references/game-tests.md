# Testing a game or feature

Layers, from cheap to expensive. Use every layer that the change touches; don't test the same thing at three layers.

| Layer | Where | What it proves |
| --- | --- | --- |
| Rules | `src/<game>/logic.test.ts` | scoring, transitions, boundaries, player counts. Fixed seeds, injected clocks. |
| Simulations | `src/test/sims.ts`, `sims.test.ts` | whole games with bots at several player counts; invariants hold in every snapshot (scores add up, phase order, no stuck state). |
| Screens | `src/screens/screens.test.tsx` | every phase renders for every player, no crash on missing optional data. |
| Room actions | `src/test/games.room.test.ts` | several simulated phones on one in-memory db: real `useRoom` plus actions. Double taps, simultaneous actions, late joiners, Firebase data shape (`firebaseShape.ts`). |
| Content | `src/data/data.test.ts` | Latin script, no stray whitespace, unique ids, every question answerable. |
| DB rules | `rules/rules.test.mjs` | private data stays private, hidden answers hidden until reveal. Only if rules changed. |
| End to end | `e2e/<game>.mjs` | a full game in Chromium on phones against the production build, plus the usability probe (sideways scroll, clipped text, small buttons). |

## Conventions
- Name tests after the rule or interaction ("a tie in the vote goes to…"), so a failure explains itself.
- Assert observable outcomes and invariants, not a re-implementation of the algorithm. Cover the changed rule, its boundaries, and one complete game or interaction.
- A bug gets a regression test that fails without the fix. A playtest discovery becomes a scenario test.
- Randomness through a seeded `rng`, time through an injected clock. Never `Math.random()` or `Date.now()` in tested code paths.
- Reuse `phones.ts`, `memoryBackend.ts`, `sims.ts`, and `firebaseShape.ts`; don't build a parallel harness. Remember Firebase drops empty arrays/objects and turns arrays into objects; test the shape that comes back, not just the in-memory one.
- Run targeted tests while developing (`npx vitest run <path>`), the whole set before reporting.
