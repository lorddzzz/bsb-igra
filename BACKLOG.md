# Future work backlog

Created: 2026-10-25. Based on the repository review and follow-up discussion.

This document records decisions and suggestions for making more games for different friend groups. It is not an implementation plan. Most suggestions have not been reviewed by the owner; their presence here does not authorize implementation or establish priority.

Repository structure, branches, agent setup, infrastructure, and jobs are covered in the [prioritized repository maintenance review](docs/REPOSITORY_REVIEW.md). Its remaining recommendations are awaiting owner review; completed work is marked on the relevant item.

## Status meanings

- **Agreed direction**: the owner has chosen the direction; implementation details still need to be worked out.
- **To review**: captured for discussion, not approved or scheduled.
- **Deferred**: deliberately outside the current scope; revisit only if the stated assumptions change.

When revisiting an item, update its status and record the decision and date. Mark completed work with an implementation reference and a short note on verification.

## Agreed direction

| ID | Status | Decision |
| --- | --- | --- |
| D01 | Agreed direction | Keep one app/PWA and organize games into collections that fit different friend groups. Separate PWAs per game or group are not the current direction. |
| D02 | Agreed direction | Keep most of the current stack: React, TypeScript, Vite, Firebase Realtime Database, anonymous sign-in, and static hosting. No stack migration is agreed. |
| D03 | Agreed direction | Design for trusted friends. Preventing deliberate cheating through browser inspection, modified clients, or direct database requests is not a current priority. See B17. |

Current baseline: all six games ship through one app, one PWA manifest, one GitHub Pages deployment, and one Firebase project. Rooms currently select a single game. There is no persistent friend-group model yet.

## Suggestions awaiting review

### B01 — Group-specific game collections

**Status: To review** — the overall direction is agreed in D01; the behavior below is still a proposal.

Decide how a group selects or receives its collection: invitation link, collection picker, or saved preference. Consider which games and content are available, whether themes differ, and whether one person can belong to several groups. A collection is not automatically a private membership boundary.

Starting points: [game catalog](src/games.ts), [app and joining flow](src/App.tsx).

### B02 — Load games and content when needed

**Status: To review** — the owner expressed interest in improving eager loading; no implementation has been chosen.

Game screens are imported eagerly, bringing their logic and question banks into the initial application. Measure the production build and first load before choosing changes. Consider loading the selected game's screen, rules, and content on demand; shared imports may also need adjustment to make splitting effective.

Keep ordinary static assets on the static host. Music and sound effects already use on-device generation. Consider self-hosting fonts instead of requesting Google Fonts; font packages are already available for browser tests. Check loading and retry behavior, including after a deployment, if games become separate downloaded chunks.

Starting points: [app imports](src/App.tsx), [shared UI](src/ui/components.tsx), [HTML and fonts](index.html), [build configuration](vite.config.ts).

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

### B06 — Recover from interrupted sessions

**Status: To review**

Show when a phone is disconnected or reconnecting and make failed actions understandable. Define safe host transfer and what happens when a player leaves mid-game, rather than leaving everyone waiting indefinitely. The app remembers the room, and Kviz has some fallback progression, but these do not provide general host transfer or recovery for every game.

Starting points: [room subscriptions and presence](src/game/room.ts), [Firebase connection handling](src/backend/firebase.ts), [Kviz progression](src/kviz/room.ts), [host controls](src/screens/shared.tsx).

### B07 — Make adding a game more self-contained

**Status: To review**

Preserve the existing separation between pure game rules, room actions, and screens. Consider a game registry that connects each game's metadata, rules UI, screen, and loader, with game-specific state types. Reduce the need to edit branches in the app and shared types for each new game. Keep shared joining, identity, sound, and UI reusable; a general-purpose plugin framework is not an agreed requirement.

Starting points: [catalog](src/games.ts), [app branches](src/App.tsx), [shared room types](src/game/types.ts).

### B08 — Define the offline experience

**Status: To review**

Distinguish opening cached screens from synchronizing a multiplayer game. Real phones currently need internet access to Firebase. The `?local` backend shares browser storage between tabs; it is a development tool, not a local-network multiplayer mode. Decide what users should see and be able to do without a connection. Offline multiplayer would be a separate feature, not a PWA setting.

Starting points: [local backend](src/backend/local.ts), [backend selection](src/backend/index.ts), [service worker](pwa/sw.js).

### B09 — Verify caching and updates during play

**Status: To review**

The service worker explicitly pre-caches the page and selected metadata/icons, but not built JavaScript or CSS. A new worker activates immediately and deletes older caches, while existing pages may still run an earlier build. Review this lifecycle and test first-visit offline reopening, an update during an active game, and failed asset downloads. Preserve the current intent to avoid automatically reloading an active game.

Starting points: [service worker](pwa/sw.js), [update detection](src/ui/update.ts), [PWA browser tests](e2e/pwa.mjs).

### B10 — Handle phones running different app versions

**Status: To review**

Phones can remain on an old build while others reload. Consider recording a game/protocol version in a session and defining when different versions can play together or should be asked to refresh. Existing compatibility handling for an older Uljez phase shows this is already a practical concern.

Starting points: [build IDs](vite.config.ts), [update banner](src/App.tsx), [legacy phase recovery](src/uljez/room.ts).

### B11 — Reassess hosting only if the workflow needs it

**Status: To review** — optional; there is no agreed migration away from GitHub Pages.

GitHub Pages is adequate for the current static app. Consider Firebase Hosting if preview deployments, configurable cache headers, routing, or easier rollbacks would materially help. Compare the workflow and costs before moving; changing frontend hosting does not itself improve game synchronization or separate groups' data.

Starting points: [Pages deployment](.github/workflows/deploy.yml), [Firebase configuration](firebase.json). Reference: [Firebase Hosting](https://firebase.google.com/docs/hosting).

### B12 — Exercise complete games through Firebase

**Status: To review**

Keep the existing simulations and local browser tests. Add full-game browser coverage against the Firebase Auth and Database emulators, especially for permissions, concurrent moves, private tickets, and reconnecting. Current browser tests use the local backend by default; Uljez supports an emulator mode, and the rules have separate emulator tests.

Starting points: [browser suite](e2e/all.sh), [Uljez emulator mode](e2e/play.mjs), [rules tests](rules/rules.test.mjs), [CI checks](.github/workflows/checks.yml).

### B13 — Check actual phones, including Safari

**Status: To review**

The automated browser suite uses Chromium at phone-sized viewports. Add a short real-device check covering iPhone Safari, an installed PWA, Android, background/resume, refresh/rejoin, audio, and screen wake behavior. Consider WebKit automation as additional coverage; it does not replace actual-device checks.

Starting points: [browser helpers](e2e/phone.mjs), [audio](src/ui/sound.ts), [speech](src/ui/speech.ts), [screen wake lock](src/ui/wakeLock.ts).

### B14 — Make release checks and database deployment explicit

**Status: To review**

Unit tests and lint currently gate the Pages deployment. Browser and database-rule checks run separately and do not block it. Decide which checks must pass before releasing. Also document or automate how database rules are deployed: the Pages workflow publishes frontend files and does not publish `database.rules.json`. Plan frontend and database changes together when compatibility matters.

Starting points: [deploy workflow](.github/workflows/deploy.yml), [separate checks](.github/workflows/checks.yml), [rules configuration](firebase.json).

### B15 — Expire rooms and allocate codes atomically

**Status: To review**

Rooms have creation timestamps but no automatic expiry in this repository. Creation checks whether a code is taken and then writes the room in a separate operation, so simultaneous creators can race. Consider atomic allocation, a retention policy, and safe cleanup of abandoned rooms, while retaining finished-game summaries independently. Short room codes remain appropriate for easy sharing among trusted friends.

Starting point: [room creation](src/game/room.ts).

### B16 — Bound history downloads and watch capacity

**Status: To review**

The leaderboard listens to all history and calculates totals on the phone. If usage grows, consider group-filtered queries, pagination, or stored summaries. Check database storage, download volume, and concurrent connections before expanding distribution. Firebase's documented Spark limit was 100 simultaneous database connections at the time of review; the account's actual plan and usage were not checked, and limits should be rechecked before relying on them.

Starting points: [leaderboard subscription](src/screens/Tabela.tsx), [backend interface](src/backend/types.ts). Reference: [Firebase limits](https://firebase.google.com/docs/database/usage/limits).

## Deliberately deferred

### B17 — Protection against deliberate inspection or tampering

**Status: Deferred** — owner decision, 2026-10-25. All intended groups are trusted friends, and hacking/inspection prevention is not important for now.

Retain these observations for a future change in audience or trust assumptions:

- Checked-in rules let any authenticated user rewrite public room state, tickets, and secrets. Anonymous sign-in does not establish room membership or host authority.
- Some hidden information is only hidden by the UI: Talas targets, Licitacija bids, Blef truth markers, and question-bank answers reach clients.
- Misija's shared secret contains all roles and individual mission cards and becomes readable during mission reveals while the game continues. The phone dealing roles also generates the full role map.
- Finished history is append-only under the checked-in rules, but clients can submit invented new results.
- If stronger guarantees become necessary, review server-enforced membership, move ownership, validation, and a trusted function for dealing secrets and resolving moves. This needs to be designed with the current transactions and client-side game logic, not applied as an isolated rules patch.

This deferral concerns deliberate cheating and abuse. Recovery from ordinary disconnections, conflicting actions, and accidental data loss remains eligible for review in the items above.

Starting points: [database rules](database.rules.json), [Misija secrets](src/misija/types.ts), [Talas state](src/talas/types.ts), [Licitacija state](src/licitacija/types.ts), [Blef options](src/blef/types.ts). Reference: [Firebase rule guidance](https://firebase.google.com/docs/rules/insecure-rules).

## Review limitations

The source review did not verify live Firebase rules, account settings, billing, production download sizes, or loading performance, and did not run the test suite. Runtime and performance concerns above are candidates to verify, not claims of reproduced production failures. No code changes or migrations are authorized by this document alone.
