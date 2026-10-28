# Future work backlog

Created: 2026-10-25. Based on the repository review and follow-up discussion.

This document records decisions and suggestions for making more games for different friend groups. It is not an implementation plan. Most suggestions have not been reviewed by the owner; their presence here does not authorize implementation or establish priority.

Remaining maintenance recommendations from the 2026-10-25 repository review were consolidated here on 2026-10-28, retaining their decisions and statuses. The old review and workflow guide were retired; procedures now live in the [repository skills](.claude/skills/), and operations in the [infrastructure runbook](docs/INFRASTRUCTURE.md). Historical review IDs below identify the original recommendations, not a priority order.

Completed review work: shared agent guidance and skills (R02), the infrastructure runbook (R06, commit `eedd6dc`; console confirmations remain in B19), explicit strict TypeScript checks (R08, `60de9b0`; optional follow-up in B20), shared helpers and game-id folders (R09, `5cfe6fd`; remaining boundaries in B21), and lazy game loading (R10, `12fc21a`; see B02). Implementation and verification details remain in those commits and the [loading report](docs/plans/r10-loading.md).

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

**Status: Core loading completed, 2026-10-27; fonts To review**

Implemented in `12fc21a` (review R10): game screens and rules load on demand through [the screen registry](src/gameScreens.ts), and the shell imports no game content. The main JavaScript file shrank from 142.8 kB to 86.5 kB gzip. Failed chunk loads retry once, then offer a refresh that preserves the room. Unit/screen regression coverage and the deploy-during-use browser scenario are described in the [measurement and implementation report](docs/plans/r10-loading.md).

Remaining proposal: measure font loading on a real phone and consider self-hosting fonts instead of requesting Google Fonts; font packages are already available for browser tests. Keep ordinary static assets on the static host. Music and sound effects already use on-device generation. Broader caching and version compatibility remain B09 and B10.

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

Preserve the existing separation between pure game rules, room actions, and screens. The screen/rules loader registry is implemented in [src/gameScreens.ts](src/gameScreens.ts) (`12fc21a`); metadata remains in [src/games.ts](src/games.ts). Consider further registry consolidation and game-specific state types only where they reduce unrelated edits. Keep shared joining, identity, sound, and UI reusable; a general-purpose plugin framework is not an agreed requirement. Remaining source-boundary proposals are in B21.

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

Lint, unit tests and build currently gate the Pages deployment. Browser and database-rule checks run separately and do not block it. Database-rule publishing and recovery are now documented in [the infrastructure runbook](docs/INFRASTRUCTURE.md) (`eedd6dc`). Remaining proposals: decide whether release gates need changing or database-rule deployment needs automation. Required pre-merge checks and branch protection were explicitly deferred on 2026-10-27 (review R01); they are not approved work. Plan frontend and database changes together when compatibility matters.

Starting points: [deploy workflow](.github/workflows/deploy.yml), [separate checks](.github/workflows/checks.yml), [rules configuration](firebase.json).

### B15 — Expire rooms and allocate codes atomically

**Status: To review**

Rooms have creation timestamps but no automatic expiry in this repository. Creation checks whether a code is taken and then writes the room in a separate operation, so simultaneous creators can race. Consider atomic allocation, a retention policy, and safe cleanup of abandoned rooms, while retaining finished-game summaries independently. Short room codes remain appropriate for easy sharing among trusted friends.

Starting point: [room creation](src/game/room.ts).

### B16 — Bound history downloads and watch capacity

**Status: To review**

The leaderboard listens to all history and calculates totals on the phone. If usage grows, consider group-filtered queries, pagination, or stored summaries. Check database storage, download volume, and concurrent connections before expanding distribution. Firebase's documented Spark limit was 100 simultaneous database connections at the time of review; the account's actual plan and usage were not checked, and limits should be rechecked before relying on them.

Starting points: [leaderboard subscription](src/screens/Tabela.tsx), [backend interface](src/backend/types.ts). Reference: [Firebase limits](https://firebase.google.com/docs/database/usage/limits).

## Remaining repository maintenance

### B18 — Finish integrated-branch cleanup (R05)

**Status: Selected, completion unverified** — chosen by the owner on 2026-10-27. The last recorded review still marked remote deletion pending; local remote-tracking references are not proof of current remote state.

Refresh remote heads and revalidate integration before deleting any old feature branch. The original audit found 16 integrated branches, including three whose trees matched merge results rather than being ancestors. Enable automatic merged-branch deletion if still disabled, and prune stale references. Rebuild the audit from current Git state; do not treat the retired review's snapshot as deletion authorization for new work.

### B19 — Confirm console-only infrastructure settings (R06)

**Status: To review** — the runbook is complete; live settings remain unverified.

Confirm and record the [runbook's console settings](docs/INFRASTRUCTURE.md#settings-that-live-in-consoles-confirm-and-record): Pages source and environment policy, merged-branch deletion, Firebase anonymous sign-in and authorized domains, API-key restrictions, billing plan, capacity, alerts and backups. Compare live database rules with the checked-in file. Capacity monitoring also belongs to B16. Do not infer console state from repository configuration.

### B20 — Consider stronger indexed-access checks per module (R08)

**Status: To review** — optional follow-up; the selected TypeScript work is complete.

Both TypeScript configurations explicitly enable `strict`, `noImplicitOverride` and `noImplicitReturns` (`60de9b0`). Consider `noUncheckedIndexedAccess` incrementally where it improves Firebase-record handling through real narrowing, avoiding blanket assertions for known-valid array indices. `exactOptionalPropertyTypes` was deliberately left off because state patches use `field: undefined` to clear keys; retain that decision unless the patch convention changes.

Starting points: [app types](tsconfig.app.json), [tooling types](tsconfig.node.json), [backend patch convention](src/backend/types.ts).

### B21 — Revisit remaining source boundaries only when useful (R09)

**Status: To review; data migration and CSS splitting deferred** — the selected shared-helper moves and game-id renames are complete (`5cfe6fd`). The lazy registry and separate rules screens followed in `12fc21a`.

Screens remain in `src/screens/`; consider colocation only when it helps an actual change. `Pub` still carries Uljez fields at the top level: nesting them was judged not worth a stored-data migration for short-lived rooms. Splitting [styles.css](src/styles.css) was deferred because it saves little download weight and risks cascade changes; any later split needs a visual check per game. Internal names such as `WaveState` and `useWaveActions`, and stored keys such as `pub.wave`, intentionally remain. Broader game registration is B07.

### B22 — Set portable maintenance conventions (R11)

**Status: To review**

Consider `.gitattributes` and `.editorconfig`, especially LF for retained shell scripts, and lightweight formatting conventions to avoid Windows/Linux line-ending churn. Keep dependency manifests and lockfiles together. Choose a modest dependency/Actions review cadence or grouped automation; avoid maintenance noise. Branch and delivery conventions already live in [AGENTS.md](AGENTS.md). Automatic fetch pruning is optional.

### B23 — Review leftovers as compatibility decisions (R12)

**Status: To review** — no specific deletion is approved.

Require evidence before removing exports, CSS selectors, or compatibility paths. Legacy `uljez-*` browser-storage keys retain names, rooms and settings; rename only with migration or an intentional reset decision. Keep old Uljez phase recovery and default-game handling unless proven obsolete. The `bsb-igra` URL and Firebase identifiers are active infrastructure, and font development packages support browser tests. Product branding cleanup does not authorize infrastructure renames.

Starting points: [saved player and room](src/App.tsx), [Uljez recovery](src/uljez/room.ts), [screen fallback](src/gameScreens.ts), [browser helpers](e2e/phone.mjs).

Review R07 is already covered by B12 and B13; its existing CI screenshot artifacts need not be proposed again.

## Deliberately deferred

### B24 — Require checks before merge (R01)

**Status: Deferred** — owner decision, 2026-10-27: not important for this project now.

If release needs change, consider pull-request validation, stable required checks and branch protection without a ceremonial second reviewer. Decide which slower suites should gate release (B14). Current workflows validate pushes to `main`; the separate full checks do not block deployment. Recheck GitHub settings before assuming the original review's branch-protection snapshot is current.

### B25 — Make setup and test orchestration portable (R03)

**Status: Deferred** — owner decision, 2026-10-27: not important for this project now.

If revisited, document supported Node/npm versions, browser installation and Java prerequisites; replace Unix-only test orchestration where useful. [The browser runner](e2e/all.sh) can reuse stale `dist` and has no server-start deadline; a future runner should build fresh code, bound waits and clean up children. [The PWA test](e2e/pwa.mjs) also uses Unix executable paths. Consider locking the Firebase CLI instead of resolving `firebase-tools@14` through `npx`, and a convenient validation command. Verify a fresh Windows checkout and CI when implementing.

### B26 — Make the development database choice explicit (R04)

**Status: Deferred** — owner decision, 2026-10-27: not important for this project now.

[Backend selection](src/backend/index.ts) still defaults to live Firebase, even during development. Verification must use `?local` or `?emu` as required by AGENTS.md. If revisited, make local/emulator the ordinary development choice and live access intentional; use a separate development project only if persistent shared test data is needed. The public Firebase client configuration is not a secret.

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
