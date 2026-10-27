---
name: verify-change
description: Pick and run the right checks for the change at hand (lint, unit tests, build, database rules, e2e, or docs checks) and report results honestly. Use before committing or saying work is complete.
---

# Verify a change

Match the checks to what changed, run them yourself, and report faithfully. The owner's playtests are for feel and direction, not for catching what a command can catch.

## Choose checks from the diff (`git status`, `git diff --stat`)

| Changed | Run |
| --- | --- |
| Anything in `src/`, config, deps | `npm run lint`, `npm test`, `npm run build` (build includes type checking) |
| Screens, styles, UI components | the above, plus the `verify-ui` skill |
| `database.rules.json` or `rules/` | the first row, plus `npm run test:rules` (needs Java) |
| Game flow across screens, new game, room or sync logic | the first row, plus `npm run e2e` (~8 min) or the single `e2e/<game>.mjs` |
| PWA, `pwa/sw.js`, manifest | the first row, plus `node e2e/pwa.mjs` against a fresh build |
| Docs and prose only | resolve local links and file paths, check commands against `package.json`, `git diff --check`. No runtime tests. |
| CI, workflows, config | run the affected tool where you can (build, a dry run, the script itself) |

Deploy gates only lint, unit tests and build; rules and e2e do not gate it, so they are on you.

## Do it well

- Run checks after the final edit, not before. Re-run after any fix.
- Behavior change means a test at the right layer: a rule or scenario test in `src/<game>/logic.test.ts`, a multi-phone sim in `src/test/`, or an e2e step. A bug fix gets a regression test that fails without the fix; confirm it fails first when practical.
- Test observable outcomes and invariants, not a copy of the algorithm. Fixed seeds and injected clocks, never real randomness or time.
- Read your own diff adversarially before reporting: leftover debug code, unrelated formatting, a missing doc or backlog status update.
- Fix failures at the root. Never skip, disable or loosen a test to get green. If a failure looks unrelated, show it fails on `main` too before saying so.
- Update docs and the BACKLOG status when behavior or a decision changed.

## Report

One short block: what ran and passed, what failed (paste the relevant output), what could not run and why, and what only a human or a real device can confirm. Do not say "should work" for anything you did not run.
