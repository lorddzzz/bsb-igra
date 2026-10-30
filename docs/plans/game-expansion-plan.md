# Prepare for more games

Approved by the owner on 2026-10-30: implement the recommended bounded B07 → B12 → B10 → B06 preparation round, using subagents.

## Scope and decisions

- B07: put join capacity and badge choice alongside game metadata; preserve existing rules, player counts, lazy downloads and stored room shapes. Keep Uljez's legacy fields until a separate migration is warranted.
- B12: reusable independent phone contexts for emulator browser runs, all six full-game flows selectable against Auth/Database emulators, a safe demo-project runner and CI coverage. Keep local tests and never contact live Firebase.
- B10: new rooms record a protocol version; missing version means the current legacy protocol (1). Unknown games, malformed versions and incompatible protocols stop before joining, mounting game actions, sound or history recording. Show refresh/leave guidance. Build IDs are not protocol versions; compatible releases may mix.
- B06: shared connection and subscription-error feedback; action failures handled by the shared Button; deterministic, explicit host takeover by a connected existing player only when the old host is confirmed offline. Do not remove missing players or invent their secret moves; explain that the group must wait/rejoin or create a new room. No automatic reloads or silent host changes.

Non-goals: collections, persistent identities, gathering lobby, offline multiplayer, cache lifecycle redesign, stored-room migration, changed game rules, new dependencies or live infrastructure changes.

## Contracts and ownership

| Task | Deliverable / ownership | Role / size | Dependencies | Acceptance / verification |
| --- | --- | --- | --- | --- |
| A | Catalog metadata: `src/games.ts`, `src/game/badges.ts`, compatibility reexports in `src/game/types.ts`, catalog tests | Medium / S | None | `gameDefinition(id: string | undefined)` returns known metadata (undefined means legacy Uljez); metadata has `maxPlayers` and `badges`; no game content imports; targeted tests |
| B | Emulator tooling: `e2e/`, emulator runner, `package.json` script and CI job | Medium / M | Existing app contract | Six complete game flows run locally and in emulator mode; distinct authenticated users; no production project; actual emulator run |
| C | Compatibility, room subscription recovery and host takeover, backend connection signal, shared UI/action errors and tests | Primary / L | A before room integration | Legacy rooms accepted; unknown/incompatible rooms cannot join or mount game hooks; offline/failed subscriptions shown; takeover transaction checks old host and presence; multi-phone, UI tests |
| D | Integration, documentation, independent review and final verification | Primary + Strong reviewer / M | A–C | Lint, full tests, build, rules, local full e2e, emulator full e2e; phone screenshot inspection; diff review |

Connection contract: optional `Backend.connection(cb)` returns unsubscribe and emits a boolean; absence means connected for existing in-memory backends. Firebase uses `.info/connected`; local remains connected. Room feedback belongs outside game screens, so future games inherit it.

Work in one task branch with disjoint agent ownership. Agents do not commit or push. Primary owns room changes and final docs, tests and commit. No usage readout is exposed; at most two agents run concurrently.

Verification-driven adjustment: the existing PWA rebuild command failed on Windows. Invoke Vite through Node, retain shell scripts with LF via `.gitattributes`, and run Uljez to its quick-game ending in the full local suite as well as the emulator suite. These are limited test-tooling fixes, not a broader formatting rollout.
