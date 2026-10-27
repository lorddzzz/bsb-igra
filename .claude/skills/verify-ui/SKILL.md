---
name: verify-ui
description: Verify a UI change in a real browser at phone size, in local or emulator mode, with an inspected screenshot. Use after any change to screens, styles, components or layout, and before reporting UI work as done.
---

# Verify a UI change

Goal: see the change the way a player on a phone would, and report what was and was not proven. Never use the live Firebase backend for this.

## Steps

1. **Server.** Reuse a running dev server or start `npm run dev`. Open `http://localhost:5173/?local` (tabs simulate phones) or `?emu` (needs the Firebase emulators). A plain URL hits live Firebase: don't.
2. **Own tab, phone viewport.** Use the runtime's browser tool (Playwright is installed; `e2e/phone.mjs` has the project's phone context, real fonts and the usability probe). Start at 375×812. Add 390×844 or 375×667 (iPhone SE, the smallest we support) when the layout is tight.
3. **Reach the screen normally**: through the controls, a room link, or the helpers used in `e2e/<game>.mjs`. Don't fake state if a real path exists.
4. **Exercise the change.** Tap through it, including waiting, error, empty and recovery states. For multiplayer, open one tab per player and inspect each affected player's view, not just the host's. Try double taps and a mid-round refresh when the change touches game flow.
5. **Inspect**: text clipped or wrapped badly, horizontal scroll (`document.documentElement.scrollWidth > innerWidth`), controls under about 44px, safe-area spacing, contrast, Serbian diacritics rendering, and console errors or warnings.
6. **Screenshot and look at it.** Save under `e2e/shots-manual/` (git-ignored). Open the image and actually read it; a saved file nobody viewed is not evidence.
7. **Fix and re-check** until clean. A visual fix needs a fresh screenshot.
8. **Clean up**: stop only the servers you started, restore any browser setting you changed.

## When to go further

- A flow change in a game: run that game's script, `node e2e/<game>.mjs` against `npm run build && npx vite preview --port 5173`, or the full `npm run e2e` (~8 min) when several screens changed.
- Layout risk: also run with `WIDTH=375 HEIGHT=667`.

## Report

State viewport(s), what you tapped, what you saw, screenshot paths, and any problem left. Always list what still needs a real device: installed-PWA behavior, mobile speech and audio, backgrounding, Safari quirks, real-network sync and Firebase permissions. A resized desktop browser and the local backend prove none of those.
