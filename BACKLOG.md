# Future work backlog

Created: 2026-10-25. Based on the repository review and follow-up discussion.

This document records decisions and suggestions for making more games for different friend groups. It is not an implementation plan. Most suggestions have not been reviewed by the owner; their presence here does not authorize implementation or establish priority.

This backlog contains only possible future work. Remove completed, rejected, deferred, or otherwise dropped tasks rather than keeping a status archive. For a partly completed item, retain only the remaining proposal. Git history records past outcomes. Keep existing IDs stable; gaps are intentional.

Procedures live in the [repository skills](.claude/skills/), and operations in the [infrastructure runbook](docs/INFRASTRUCTURE.md).

## Status meanings

- **Agreed direction**: the owner has chosen the direction; implementation details still need to be worked out.
- **To review**: captured for discussion, not approved or scheduled.

When revisiting an item, record the decision and date while it remains future work. Completion and verification belong in the implementation commit or relevant technical documentation.

## Agreed direction

| ID | Status | Decision |
| --- | --- | --- |
| D01 | Agreed direction | Keep one app/PWA and organize games into collections that fit different friend groups. Separate PWAs per game or group are not the current direction. |
| D02 | Agreed direction | Keep most of the current stack: React, TypeScript, Vite, Firebase Realtime Database, anonymous sign-in, and static hosting. No stack migration is agreed. |
| D03 | Agreed direction | Design for trusted friends; deliberate-cheating prevention is outside the app's scope. |

Current baseline: all six games ship through one app, one PWA manifest, one GitHub Pages deployment, and one Firebase project. Rooms currently select a single game. There is no persistent friend-group model yet.

## Suggestions awaiting review

### B01 — Group-specific game collections

**Status: To review** — the overall direction is agreed in D01; the behavior below is still a proposal.

Decide how a group selects or receives its collection: invitation link, collection picker, or saved preference. Consider which games and content are available, whether themes differ, and whether one person can belong to several groups. A collection is not automatically a private membership boundary.

Starting points: [game catalog](src/games.ts), [app and joining flow](src/App.tsx).

### B02 — Measure and improve font loading

**Status: To review**

Measure font loading on a real phone and consider self-hosting fonts instead of requesting Google Fonts; font packages are already available for browser tests. Evaluate perceived loading time, offline availability, file size, and appearance while fonts load. Broader caching and version compatibility remain B09 and B10.

Starting points: [HTML and fonts](index.html), [build configuration](vite.config.ts), [loading measurements](docs/plans/r10-loading.md#separate-decision-fonts).

### B03 — Separate history by friend group

**Status: To review**

The leaderboard currently reads one global history and combines all players. Consider group-scoped history, scores, and titles. Decide what should happen to existing records, which do not identify a group; do not guess their group automatically.

Starting points: [recording games](src/history/record.ts), [leaderboard](src/screens/Tabela.tsx).

### B04 — Give returning players stable identities

**Status: To review**

Leaderboard identity is currently a normalized display name, so unrelated people with the same name are merged. Consider a stable player identifier with an editable display name. Decide whether identity only needs to survive on one phone or should also survive a new device or cleared browser storage, while preserving easy joining without mandatory accounts.

Starting points: [history aggregation](src/history/logic.ts), [anonymous authentication](src/backend/firebase.ts), [saved name](src/App.tsx).

### B05 — Keep a gathering together across different games

**Status: To review**

A room currently has a fixed game. Consider a gathering with a shared invitation and player list, containing individual game sessions: join once, play a game, return to the gathering lobby, then choose another game. Work out rematches, late arrivals, and score/history ownership before changing the room model.

Starting points: [room creation and joining](src/game/room.ts), [room types](src/game/types.ts), [shared lobby](src/screens/shared.tsx).

### B08 — Define the offline experience

**Status: To review**

Distinguish opening cached screens from synchronizing a multiplayer game. Real phones currently need internet access to Firebase. The `?local` backend shares browser storage between tabs; it is a development tool, not a local-network multiplayer mode. Decide what users should see and be able to do without a connection. Offline multiplayer would be a separate feature, not a PWA setting.

Starting points: [local backend](src/backend/local.ts), [backend selection](src/backend/index.ts), [service worker](pwa/sw.js).

### B09 — Verify caching and updates during play

**Status: To review**

The service worker explicitly pre-caches the page and selected metadata/icons, but not built JavaScript or CSS. A new worker activates immediately and deletes older caches, while existing pages may still run an earlier build. Review this lifecycle and test first-visit offline reopening, an update during an active game, and failed asset downloads. Preserve the current intent to avoid automatically reloading an active game.

Starting points: [service worker](pwa/sw.js), [update detection](src/ui/update.ts), [PWA browser tests](e2e/pwa.mjs).

### B11 — Reassess hosting only if the workflow needs it

**Status: To review** — optional; there is no agreed migration away from GitHub Pages.

GitHub Pages is adequate for the current static app. Consider Firebase Hosting if preview deployments, configurable cache headers, routing, or easier rollbacks would materially help. Compare the workflow and costs before moving; changing frontend hosting does not itself improve game synchronization or separate groups' data.

Starting points: [Pages deployment](.github/workflows/deploy.yml), [Firebase configuration](firebase.json). Reference: [Firebase Hosting](https://firebase.google.com/docs/hosting).

### B13 — Check actual phones, including Safari

**Status: To review**

The automated browser suite uses Chromium at phone-sized viewports. Add a short real-device check covering iPhone Safari, an installed PWA, Android, background/resume, refresh/rejoin, audio, and screen wake behavior. Consider WebKit automation as additional coverage; it does not replace actual-device checks.

Starting points: [browser helpers](e2e/phone.mjs), [audio](src/ui/sound.ts), [speech](src/ui/speech.ts), [screen wake lock](src/ui/wakeLock.ts).

### B14 — Consider automating database-rule deployment

**Status: To review**

Decide whether database-rule publishing needs automation beyond the manual procedure in [the infrastructure runbook](docs/INFRASTRUCTURE.md). Plan frontend and database changes together when compatibility matters.

Starting points: [deploy workflow](.github/workflows/deploy.yml), [rules configuration](firebase.json).

### B15 — Expire rooms and allocate codes atomically

**Status: To review**

Rooms have creation timestamps but no automatic expiry in this repository. Creation checks whether a code is taken and then writes the room in a separate operation, so simultaneous creators can race. Consider atomic allocation, a retention policy, and safe cleanup of abandoned rooms, while retaining finished-game summaries independently. Short room codes remain appropriate for easy sharing among trusted friends.

Starting point: [room creation](src/game/room.ts).

### B16 — Bound history downloads and watch capacity

**Status: To review**

The leaderboard listens to all history and calculates totals on the phone. If usage grows, consider group-filtered queries, pagination, or stored summaries. Check database storage, download volume, and concurrent connections before expanding distribution. Firebase's documented Spark limit was 100 simultaneous database connections at the time of review; the account's actual plan and usage were not checked, and limits should be rechecked before relying on them.

Starting points: [leaderboard subscription](src/screens/Tabela.tsx), [backend interface](src/backend/types.ts). Reference: [Firebase limits](https://firebase.google.com/docs/database/usage/limits).

## Remaining repository maintenance

### B19 — Confirm console-only infrastructure settings (R06)

**Status: To review**

Confirm and record the [runbook's console settings](docs/INFRASTRUCTURE.md#settings-that-live-in-consoles-confirm-and-record): Pages source and environment policy, Firebase anonymous sign-in and authorized domains, API-key restrictions, billing plan, capacity, alerts and backups. Compare live database rules with the checked-in file. Capacity monitoring also belongs to B16. Do not infer console state from repository configuration.

### B20 — Consider stronger indexed-access checks per module (R08)

**Status: To review**

Consider `noUncheckedIndexedAccess` incrementally where it improves Firebase-record handling through real narrowing, avoiding blanket assertions for known-valid array indices.

Starting points: [app types](tsconfig.app.json), [tooling types](tsconfig.node.json), [backend patch convention](src/backend/types.ts).

### B22 — Set portable maintenance conventions (R11)

**Status: To review**

Consider `.editorconfig` and lightweight formatting conventions to keep source and prose consistent across Windows and Linux. Keep dependency manifests and lockfiles together. Choose a modest dependency/Actions review cadence or grouped automation; avoid maintenance noise. Branch and delivery conventions already live in [AGENTS.md](AGENTS.md). Automatic fetch pruning is optional.
