# R10: loading, measurement and proposed plan

Status: **measured, nothing implemented, awaiting owner decision.** Measured 2026-10-27 on `main` at `5cfe6fd` (production build, sizes from `vite build`; no real-device or network timing).

## Baseline

| File | Size | Gzip | When loaded |
| --- | --- | --- | --- |
| `index-*.js` (React, all six games, all data, shell) | 441 kB | 142.8 kB | every visit |
| `index-*.css` (one file) | 32.5 kB | 7.1 kB | every visit |
| `firebase-*.js` | 232.9 kB | 69.1 kB | every visit except `?local` (dynamic import already) |
| `local-*.js`, `types-*.js` | 1.6 kB | 0.9 kB | small |
| Google Fonts stylesheet (Bangers, Manrope) | external | - | every visit, render-blocking `<link>` in `index.html` |

A first visit on a phone is roughly 220 kB gzip of our own files plus the font requests. Inside the main chunk React is about 60% of the code and cannot be reduced; the rest is the six games' screens, rules and logic plus content (`kvizQuestions` alone is 67 kB of source).

## What pulls games into the startup chunk

Types are erased at build time, so only value imports count.

1. `App.tsx` imports all six screens statically (the intended thing to change).
2. `App.tsx` imports `MisijaRules` from `screens/Misija.tsx`, which drags the whole Misija screen into the shell. The other games' rules live in `ui/components.tsx`.
3. `history/logic.ts` (home scoreboard) imports `licitacija/logic` and `misija/logic`; `game/room.ts` imports `LIC_PLAYERS` from `licitacija/logic`. Small, and legitimately needed on the home screen, so they can stay.
4. `ui/components.tsx` imports `data/words` (Uljez) and `kviz/cards`; both are small.

The review's claim that shared UI pulls in *every game's content* is only partly true: the large content files (`kvizQuestions`, `blefQuestions`, `waveScales`) are imported by their own game and its screen only.

## Experiment (reverted, not committed)

`React.lazy` for all six screens, and `MisijaRules` moved next to the other rules text:

| Chunk | Gzip |
| --- | --- |
| main (shell) | 93.3 kB (from 142.8) |
| Kviz | 23.8 kB |
| Blef | 10.0 kB |
| Misija | 6.6 kB |
| Uljez | 5.9 kB |
| Talas | 5.9 kB |
| Licitacija | 2.9 kB |
| shared helper chunk | 1.3 kB |

Net effect: the shell shrinks by about 50 kB gzip (35%). A first visit that only needs Uljez saves about 43 kB of roughly 220 (about 20%); a Kviz visit saves about 25 kB. That is a real but modest gain, and it comes with the risk below. Without the `MisijaRules` move, only 43 kB of the 50 is saved and Misija stays in the shell.

## The risk that needs care: chunk 404 after a deploy

Today one JS file is loaded at start, so an old phone can never ask for a file that no longer exists. With lazy chunks it can:

1. A phone opened the app on build A and sits on the home screen. The update banner only asks to refresh; it never reloads by itself.
2. A deploy of build B replaces every hashed file on Pages. Old files return 404.
3. The player makes or joins a room. The screen chunk `Kviz-<hash from A>.js` is requested and fails (the service worker's cache for build A is deleted when worker B activates, and the file is not on the server any more).
4. React throws on the rejected lazy import; the existing `Crashed` boundary shows "Ups, nešto je puklo" with a reload button. The room code is remembered, so reload lands in the same room on build B.

So the failure is recoverable with one tap, never loses game state (a phone already inside a game loaded that game's chunk), and only affects phones that stayed on the home screen across a deploy. It must still be handled deliberately, not left to the generic crash screen.

Other lifecycle checks:
- Offline: a game chunk that was never opened is not in the cache, so such a game cannot start offline. Multiplayer needs the network anyway; the home screen and the shell still open offline (already tested in `e2e/pwa.mjs`).
- Flaky network: a chunk can fail transiently, not only after a deploy.
- The service worker serves hashed files cache-first and needs no change for correctness.

## Proposed plan (smallest change that earns its keep)

1. **Registry, one place.** A `src/gameScreens.tsx` mapping `GameId` to its lazy screen and rules component. It replaces the two `if` chains in `App.tsx` and the long rules ternary, and makes "add a game" one entry. Update AGENTS.md and the `add-game` skill.
2. **Lazy loader with recovery.** A small `lazyScreen(import)` wrapper: retry the import once or twice with a short delay (flaky network); if it still fails, show a clear "Nova verzija je stigla, osveži" card with a reload button instead of the generic crash text. Wrap in `Suspense` with the existing `Waiting` card.
3. **Move `MisijaRules`** into `ui/components.tsx` with the other rules (pure move).
4. **Tests.** Unit: the wrapper retries and then reports failure. Screen tests keep importing screens directly. Extend `e2e/pwa.mjs`: from the home screen, deploy a new build, then enter a room and assert the recovery card appears and reload returns to the same room on the new build. Re-run the whole e2e suite, since screens now load asynchronously.
5. **Record** before/after sizes in this file.

Not proposed now:
- Splitting `styles.css` (7 kB gzip total; a split saves little and risks cascade order).
- Lazy-loading the music/sound engine (about 5 kB gzip).
- Keeping the previous build's cache alive in the service worker to make step 3 above impossible. It would need a full precache list per build and a two-generation cache policy; worth it only if the recovery card turns out to be hit in practice.

## Separate decision: fonts

`index.html` blocks first paint on a request to Google Fonts, and fonts do not work offline. `@fontsource/bangers` and `@fontsource/manrope` are already installed (for the browser tests) and could be self-hosted, served from the same origin and cached by the service worker. This probably affects perceived load time on a phone more than the 50 kB above, but it cannot be measured in this environment (no real network or device), costs some kB of font files, and changes how the app looks while loading. Treat it as its own task (backlog B02/B09 area) and measure on a real phone first.

## Decision needed

Is a ~20% smaller first visit worth a new lazy-loading failure path and its recovery card? If yes, steps 1 to 5 are one focused change. If not, leave loading as it is: the registry in step 1 can still be done alone as a readability change, and the effort is better spent on the font question above.
