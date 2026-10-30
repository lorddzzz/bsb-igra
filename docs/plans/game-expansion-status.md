# Game expansion preparation status

Plan: [game-expansion-plan.md](game-expansion-plan.md). Updated: 2026-10-30. Usage: unknown.
State: complete
Next: when releasing, publish the checked-in database rules first, then deploy the frontend. No live deployment was performed in this implementation task.

| ID | Scope / role / model / effort | Size | State | Branch / files | Verification / remaining |
| --- | --- | --- | --- | --- | --- |
| A | Catalog / Medium / gpt-6.1-sol / medium | S | complete | main | Catalog and join tests passed |
| B | Emulator tooling / Medium / gpt-6.1-sol / medium | M | complete | main | All six complete emulator flows passed; identity, refresh, transport reconnect, own-ticket access and denied other-ticket/secret reads verified. Cleanup ports verified free |
| C | Compatibility and recovery / primary | L | complete | main | 343 unit tests, lint and build passed. Recovery probes passed at 375×812 and 375×667; inspected screenshots plus disconnected 390×844 screenshot. Actual emulator UI takeover/former-host rejoin passed. All 10 database-rule tests passed |
| D | Review, docs, checks / primary + Strong / gpt-6.1-sol / high | M | complete | main | Two review passes: no remaining actionable finding after session race fix. Full local suite exited 0, including complete Uljez, all other games, explore, recovery and PWA update/offline checks. Local links and staged diff checked |

## Decisions and unresolved proposals

The user approved the recommended preparation round. B06 is bounded to explicit host recovery, connection/error feedback and a documented missing-player policy, preserving game rules. No unresolved product decision blocks this scope.

## Integration risks and follow-ups

Legacy phones cannot acquire new compatibility guards retroactively. Emulators require Java and cached or downloadable Firebase tools. Actual Safari, installed PWA behavior and real-network background/resume remain real-device checks.

The first emulator privacy probe found that CLI defaults did not install rules into the app's exact demo namespace; the runner now installs the checked-in rules there and asserts unauthenticated denial before any game. Live Firebase was not accessed. Database host-transfer validation must be published separately before frontend release. Multiple same-identity tabs retain the existing per-UID presence limitation.

The exploratory screenshot probe reports an ellipsized emoji name in a dense Uljez voting row. The screenshot was inspected: the full name remains visible in the verdict and vote summary; the unchanged player-name style intentionally uses ellipsis in the row. No changed recovery screen has a layout finding.

## Verification

- `npm run lint`: passed with warnings; no lint errors.
- `npm test`: 343 passed across 26 files.
- `npm run build`: passed, including type checking; game screens/content remain separate chunks.
- `npm run test:rules`: 10 passed, including host grace, membership, candidate presence, competing replacements and host reconnect checks.
- `npm run e2e` through Git Bash on Windows: final complete run exited 0.
- Emulator runner: six complete game flows exited 0; `E2E_GAME=recovery npm run test:e2e:emu` separately exited 0 with actual UI host takeover and former-host rejoin.
- Phone-sized screenshots inspected under `e2e/shots-manual/recovery-375`, `e2e/shots-manual/recovery-se`, and `e2e/shots-emu/lic/00-disconnected.png`.
- GitHub CI and deployment were not run: the implementation is committed locally. Real-device Safari, installed PWA, mobile audio and real-network background/resume remain unverified.
