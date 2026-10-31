# Infrastructure and releases

What runs where, how a change reaches players, and how to recover. Facts below come from the repository. Items marked **console** live only in the GitHub or Firebase web consoles, were not inspected when this was written, and should be confirmed by the owner and then edited here.

## Pieces

| Piece | Where | Source of truth |
| --- | --- | --- |
| Frontend (static PWA) | GitHub Pages, <https://lorddzzz.github.io/bsb-igra/> | `main`, built by [deploy.yml](../.github/workflows/deploy.yml) |
| Database | Firebase Realtime Database, project `bsb-igra`, region `europe-west1` (`bsb-igra-default-rtdb.europe-west1.firebasedatabase.app`) | Data: the console. Rules: [database.rules.json](../database.rules.json) |
| Sign-in | Firebase Authentication, anonymous provider | **console** (provider must be enabled) |
| Client config | [src/firebaseConfig.ts](../src/firebaseConfig.ts) | Repository. Public by design; the rules protect the data |
| Emulator project | `demo-uljez` (never a real project) | [firebase.json](../firebase.json), [src/backend/index.ts](../src/backend/index.ts) |

There is no `.firebaserc`, so every Firebase CLI command that touches the live project needs `--project bsb-igra`.

## Two separate releases

The frontend and the database rules are released independently. A push to `main` only does the first.

### Frontend

1. Push to `main`. [deploy.yml](../.github/workflows/deploy.yml) runs lint, `npm test` and the build, then publishes `dist/` to Pages. [checks.yml](../.github/workflows/checks.yml) (browser suite, rules test) runs next to it and does **not** gate the deploy.
2. Check the run for that commit, not the latest run.
3. Phones notice the new build through `version.json` and show a refresh banner; they never reload by themselves mid-game. Room compatibility is checked separately using [ROOM_PROTOCOL](../src/game/compatibility.ts): missing means legacy protocol 1; unknown games and incompatible protocols require refresh or a new room. Bump only for incompatible room/move changes. Phones running builds from before this guard still need to refresh.

### Database rules

Rules are **not** published by any workflow. After changing `database.rules.json`:

1. `npm run test:rules` (needs Java).
2. Publish by hand with the Firebase CLI, logged in as someone with access to the project: `npx firebase-tools@14 deploy --only database --project bsb-igra`. Or paste the file into the console (Realtime Database, Rules) and publish.
3. Order matters when old and new builds coexist: publish rules that accept both shapes first, then the frontend; tighten afterwards.

Whether the live rules currently match the file is **unverified**: compare the console Rules tab with `database.rules.json`.

The game-expansion preparation adds a host-change validation: only an online existing player can replace a host who has been confirmed offline for at least 15 seconds. Publish these rules before deploying that frontend. The client checks first for useful feedback; the rule is what rejects a reconnect that races the transfer. It preserves ordinary writes and room creation by legacy builds.

## Room retention

Rooms are deleted from the phones, since there is no server-side job:

- The host leaving a room (the exit button or any Back button) deletes it, after saving a finished game to `history/`.
- Creating a room first deletes up to 20 rooms unused for 24 hours, skipping any with a phone still connected. "Unused" is `roomIndex/<code>`, a timestamp refreshed when a room is created, joined or opened by a player. Clients cannot list `rooms` (that would expose the secrets), so `roomIndex` is how they find old rooms. Rules also let anyone delete a room that old, and let only the host delete a fresh one.
- A phone connected to a deleted room shows "Soba je zatvorena" and forgets it.
- `history/` is never deleted. Rooms made by builds from before this change have no index entry and are not found by the cleanup; delete the `rooms` node by hand in the console once (Realtime Database, Data, `rooms`, delete), at a quiet moment since it ends any live game.
- Publish the rules before or together with the frontend. The frontend tolerates old rules (index and delete writes are best effort), but nothing is cleaned up until they are live.

## Recovery

- **Bad frontend release.** Revert the commit on `main` (a new commit, not a history rewrite) and push; Pages redeploys the previous code. Or re-run the deploy workflow on a known-good commit with "Run workflow" on that ref if the environment's branch policy allows it. This restores code only. It does not undo anything written to the database, and phones that already loaded the bad build need a refresh.
- **Bad rules release.** Re-publish the previous version of `database.rules.json` from Git (`git show <good-commit>:database.rules.json`) with the same deploy command. The console also keeps a rules history (**console**).
- **Lost or corrupted data.** Reverting code does not restore data. Rooms are short-lived; the valuable data is `history/` (the all-time scoreboard). Export it from the console (Realtime Database, Data, three-dot menu, Export JSON) before risky changes, and restore with Import JSON on the same node. Whether automatic backups exist on the current plan is **console**; assume they do not.
- **Rebuilding from scratch.** Create a Firebase project, add a web app and copy its config into `src/firebaseConfig.ts`, create a Realtime Database in the chosen region (this changes `databaseURL`), enable the Anonymous sign-in provider, publish the rules, then deploy the frontend.

## Settings that live in consoles (confirm and record)

- GitHub: Pages source set to GitHub Actions; the `github-pages` environment's branch policy; `main` branch protection (none, when last checked, and not wanted for this project); automatic deletion of merged branches.
- Firebase: Anonymous sign-in enabled; authorized domains include `lorddzzz.github.io`; API key restrictions, if any; billing plan (Spark or Blaze) and its connection limit; alerts and budget.
- Review the Firebase usage page and the plan's limits now and then, and before inviting a larger group (backlog B16).
