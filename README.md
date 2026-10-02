# Uljez · Backstreet Edition

A party word game for 3 to 5 friends on their phones. Everyone gets the same secret word except the impostor (*uljez*), who only knows the category. Each round has 1 or 2 impostors. Two rounds of one-word clues, then a vote. The whole game is in Serbian (latinica).

**Play:** https://lorddzzz.github.io/bsb-igra/

## How it works

- React + TypeScript (Vite), hosted on GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`.
- Phones sync through Firebase Realtime Database with anonymous sign-in. `database.rules.json` keeps each ticket private to its owner and hides the round's answer until voting is over.
- Words and categories: `src/data/words.ts`. Scoring: `src/game/logic.ts`.

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
| `npm run test:coverage` | Unit and isolation tests with a coverage report in `coverage/`. | ~15 s |

`npm test` and `npm run lint` run before every deploy; the browser suite and the rules test run next to it in `.github/workflows/checks.yml`.

`firebase emulators:start --only auth,database`, then `MODE=emu node e2e/play.mjs`, plays Uljez against the real rules.
