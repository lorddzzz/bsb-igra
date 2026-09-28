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
npm test               # scoring and round setup tests
npx vite --port 5173 & node e2e/play.mjs          # 4 simulated phones play two rounds, screenshots in e2e/shots
node e2e/kviz.mjs                                 # 4 phones play a full Kviz (trivia) game; also blef.mjs, wave.mjs
firebase emulators:start --only auth,database     # then MODE=emu node e2e/play.mjs to test against the rules
```
