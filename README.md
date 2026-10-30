# Družina

Six party games for friends on their phones, in a comic-book hero HQ look. One shared link, a 4-letter room code, phones synced live. The whole app is in Serbian (latinica).

- **Uljez**: everyone gets the same secret word except the impostor, who only knows the category. Two rounds of one-word clues, then a vote.
- **Blef**: a strange true fact with a blank; invent a believable lie, then find the truth.
- **Talas**: Wavelength-style scale guessing.
- **Kviz**: live trivia with attack cards and special rounds.
- **Licitacija**: secret bidding for two.
- **Misija**: Avalon-style hidden roles for 5 to 12.

Every finished game is saved to an all-time scoreboard ("Tabela svih vremena" on the home screen): wins and points per player name across gatherings, plus fun titles such as most escapes as impostor. Names are matched ignoring case, spaces and accents (`src/history/`).

**Play:** https://lorddzzz.github.io/bsb-igra/

Future direction and suggestions, with their review status, are tracked in [BACKLOG.md](BACKLOG.md).

Hosting, database rules, releases and recovery are described in [the infrastructure runbook](docs/INFRASTRUCTURE.md).

Agent and contributor guidance is in [AGENTS.md](AGENTS.md), with detailed procedures in [the repository skills](.claude/skills/).

## How it works

- React + TypeScript (Vite), hosted on GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`.
- Phones sync through Firebase Realtime Database with anonymous sign-in. `database.rules.json` keeps each ticket private to its owner and hides the round's answer until voting is over. Finished games go to `history/{id}`, which anyone signed in can read and add to but never change.
- Words and categories: `src/data/words.ts`, quiz questions `src/data/kvizQuestions.ts`, Blef facts `src/data/blefQuestions.ts`. Scoring and rules: `src/<game>/logic.ts`.

## Development

```sh
npm install
npm run dev            # open http://localhost:5173/?local in several tabs to play without Firebase
```

## Testing

Three layers, from fast to slow:

| Command | What it checks | Time |
| --- | --- | --- |
| `npm test` | **Unit**: every rule of every game; bots play hundreds of whole games through the real logic with Firebase's data shape between steps (`src/test/sims.ts`); all words and questions are well formed and in latinica. **Isolation**: room actions with several fake phones on one in-memory database (`src/test/memoryBackend.ts`), every screen rendered in every state a bot game reaches, the app shell. | ~10 s |
| `npm run test:rules` | The database rules on the Firebase emulator: tickets private, answers hidden until the reveal. Needs Java. | ~20 s |
| `npm run e2e` | **End to end**: every game played start to finish in Chromium on simulated phones against the production build, plus an exploratory run (refresh mid-round, leave and rejoin, latecomer, double taps). Screenshots land in `e2e/shots-all`; a usability probe flags sideways scrolling, cut-off text and small buttons. `WIDTH=375 HEIGHT=667 npm run e2e` plays on an iPhone SE sized screen. | ~8 min |
| `npm run test:e2e:emu` | All six games against local Firebase Auth and Database emulators, with independent anonymous identities, refresh/rejoin and private-data permission checks. Requires Java and Chromium (`npx playwright install chromium`); starts and stops its own servers, refuses occupied ports, uses only `demo-uljez`. Screenshots: `e2e/shots-emu`. | ~10 min |
| `npm run test:coverage` | Unit and isolation tests with a coverage report in `coverage/`. | ~15 s |

`npm test` and `npm run lint` run before every deploy; the browser suite and the rules test run next to it in `.github/workflows/checks.yml`.

`npm run test:e2e:emu` installs the checked-in rules into the exact demo database namespace used by the app and checks access before running games. Starting emulators manually does not provide that assurance.

For one emulator flow, use `E2E_GAME=blef npm run test:e2e:emu` (PowerShell: `$env:E2E_GAME='blef'; npm run test:e2e:emu`). Supported names: `play`, `blef`, `wave`, `kviz`, `lic`, `misija`, `recovery`. The recovery flow checks an explicit host transfer and the former host rejoining.

## Adding games and recovering rooms

Follow the [add-game checklist](.claude/skills/add-game/SKILL.md). The [catalog](src/games.ts) owns join capacity and badge choices; [screen loaders](src/gameScreens.ts) keep each game's downloads separate. Shared room state retains its legacy layout to avoid migrating active rooms.

New rooms carry `protocol: 1`; legacy rooms without it are compatible. Bump [ROOM_PROTOCOL](src/game/compatibility.ts) only when old and new room data or moves cannot safely mix, not for each build or new game. Unknown games and incompatible protocols show refresh/leave guidance before joining or mounting game effects. This guard only protects phones that have loaded the updated app.

Connection loss pauses the game screen until reconnection. Failed room subscriptions offer a retry, and failed button actions show an error. An existing online player can explicitly take over after the host has been confirmed offline for 15 seconds; database rules recheck presence when committing the change. The old host remains a player and sees the new host when reconnecting. Missing players are never removed mid-game and their secret moves are never invented: wait for them to return to the same room, or start a new room. These common controls apply to future games too.

The host-transfer rule must be [published separately](docs/INFRASTRUCTURE.md#database-rules) before releasing the frontend; frontend deployment does not publish database rules.
