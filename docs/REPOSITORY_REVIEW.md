# Repository maintenance review

Reviewed: 2026-10-25. Source checkout: `19d1631`; GitHub `main`: `377de56`.

Recommendations are **To review** unless an item records a later completion. R02 was completed on 2026-10-25 at the owner's request. On 2026-10-27 the owner judged R01, R03 and R04 not important for this project; they are deferred, not planned. R05, R06, R08, R09 and R10 were chosen, in that order. Priorities are proposed by the reviewer, not approved implementation work. P1 means establish the working foundation before substantial new development; P2 means improve it as development resumes; P3 means routine housekeeping. Effort is relative, not a time estimate.

Scope: repository structure, Git/GitHub configuration, agent workflow, infrastructure, and jobs. Keep the agreed single-app direction and trusted-friends scope in [the backlog](../BACKLOG.md). Deliberate-cheating prevention remains deferred.

## Verified snapshot

- 105 tracked files at the reviewed commit; no tracked dependency directory, build output, screenshots, or coverage output. The working tree was clean before writing this review.
- One local branch (`main`), one worktree, and no stashes. Local `main` is one documentation commit ahead of GitHub; it has not been pushed. Publishing it is a separate action.
- GitHub has `main` plus 16 feature branches. All 16 feature branches have been integrated; see the branch audit below. All four pull requests are merged; none are open.
- GitHub reports `main` is unprotected, no repository rulesets, and automatic deletion of merged branches disabled.
- Both workflows run on pushes to `main` or manual dispatch, not pull requests. The latest deployment and full checks both succeeded for `377de56`.
- Pages is deployed through GitHub Actions. Its `github-pages` environment has a branch policy; it is not an environment with no controls. The database has a separate configuration and release path.
- No tracked `AGENTS.md`, `CLAUDE.md`, `.agents/`, or `.codex/` project setup. Shared instructions currently live in the README, backlog, and conversation context.
- Local Node is 24.19.0 and npm is 11.17.0; CI selects Node 22. No repository runtime version or package-manager version is declared. A Java executable was found, but its version check did not complete, so local emulator readiness is unverified.
- A static traversal of relative imports from `src/main.tsx` reached every non-test runtime source file. This did not inspect unused exports, CSS selectors, or prove that every code path is needed.

## Ranked recommendations

| Order | ID | Priority | Recommendation | Relative effort |
| --- | --- | --- | --- | --- |
| 1 | R01 | P1 | Check changes before merge and protect the release branch | Medium |
| 2 | R02 | P1 | Completed 2026-10-25: shared agent instructions and workflow guide | Small |
| 3 | R03 | P1 | Make setup and verification repeatable on Windows and CI | Medium |
| 4 | R04 | P1 | Separate ordinary development from the live Firebase database | Medium |
| 5 | R05 | P2 | Remove integrated feature branches and enable future cleanup (revalidated 2026-10-27; remote deletion pending) | Small |
| 6 | R06 | P2 | Completed 2026-10-27: infrastructure runbook ([INFRASTRUCTURE.md](INFRASTRUCTURE.md)); console-only settings still to confirm | Small–medium |
| 7 | R07 | P2 | Cover actual Firebase integration and phone behavior | Medium |
| 8 | R08 | P2 | Completed 2026-10-27 (revalidated, narrower than proposed): see R08 notes | Medium |
| 9 | R09 | P2 | Clarify shared code versus individual games | Medium |
| 10 | R10 | P2 | Measure and reduce eager loading | Medium |
| 11 | R11 | P3 | Establish portable Git, formatting, and dependency conventions | Small |
| 12 | R12 | P3 | Review legacy names and compatibility paths without breaking returning users | Small–medium |

### R01 — Check changes before merge

**Evidence:** [deploy.yml](../.github/workflows/deploy.yml) gates publishing on lint, unit tests, and build, but only after changes reach `main`. [checks.yml](../.github/workflows/checks.yml) runs browser and database-rule tests independently; these do not gate publishing. GitHub confirms there is no branch protection or ruleset.

**Proposed fix:** Run validation on pull requests, give required checks stable names, and require those checks before merging into `main`. Do not require another human reviewer merely for ceremony in a solo project. Decide which slower checks must pass before release. Keep validation separate from deployment so feature work can be tested without publishing it.

**Completion evidence:** A pull request receives the expected checks; a failing required check prevents a normal merge; only the intended branch can publish. Add job timeouts and cancel superseded validation runs where useful.

Related: backlog B14. Reference: [GitHub workflow triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

### R02 — Add reusable agent instructions

**Status: Completed, 2026-10-25** — requested by the owner.

**Original finding:** The repository had no project-level agent instructions, despite substantial agent-generated history and several decisions that should survive a new chat.

**Implemented:** [AGENTS.md](../AGENTS.md) records context, scope, source layout, current npm commands, verification, Git/delivery practices, and backlog semantics. [CLAUDE.md](../CLAUDE.md) points to that shared guidance. [The agent workflow guide](AGENT_WORKFLOW.md) covers small design rounds, verification, resumable plans, and handoffs. Source-project mechanics, tooling permissions, exact model choices, and automatic delegation/push policies were excluded.

**Verification:** Documentation links and command references checked, along with `git diff --check`. Runtime tests are not needed for this documentation-only change. Official OpenAI documentation describes repository-level [`AGENTS.md` guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Other maintenance recommendations, including portable test tooling, strict TypeScript, and CI changes, were not implemented as part of this item.

### R03 — Make local setup repeatable

**Evidence:** `npm run e2e` requires `sh`, `curl`, and Unix-style executable paths. No `sh` command was available in the reviewed Windows shell. [The runner](../e2e/all.sh) reuses any existing `dist` directory, which can test stale code, and waits for its server without a deadline. [The PWA test](../e2e/pwa.mjs) invokes a Unix-style Vite executable directly. `test:rules` downloads the latest matching Firebase CLI 14 release through `npx`, outside the lockfile. The README omits parts of browser/runtime setup.

**Proposed fix:** Choose and document supported runtime versions and prerequisites; use `npm ci` for clean setup. Make test orchestration portable, preferably with Node or the existing Playwright tooling. Build the code being tested, bound server startup waits, and clean up child processes on failure. Pin the Firebase CLI through the lockfile, document browser installation and Java requirements, and expose one convenient command for normal validation.

**Completion evidence:** A fresh Windows checkout and CI can run documented lint, unit, build, browser, and emulator commands without undocumented global tools. Browser tests cannot silently use an old build.

### R04 — Separate development from production data

**Evidence:** [Backend selection](../src/backend/index.ts) uses the checked-in production Firebase configuration by default, including during `npm run dev`. Local mode requires `?local`; emulator mode requires `?emu`.

**Proposed fix:** Give development an explicit local/emulator configuration and make the live-project choice intentional. Document which command talks to which database. Use a separate Firebase development project if persistent shared development data is needed. This addresses accidental writes during development, not adversarial security. The public Firebase web configuration does not need to be treated as a secret.

**Completion evidence:** Ordinary development and automated tests cannot accidentally create rooms or history in the live database, while the production build still connects to the intended project.

### R05 — Clean up integrated branches

**Evidence:** All 16 remote feature branches are integrated. Thirteen are ancestors of GitHub `main`; the remaining three have file trees identical to their merge results. GitHub has automatic merged-branch deletion disabled.

**Proposed fix:** After refreshing and confirming that no branch has gained new work, remove the integrated remote branches, enable automatic deletion after merging, and prune stale local remote-tracking references. Do not merge these branches again simply because an ancestry-only command lists three as unmerged. Keep a simple branch and merge convention for new work.

**Completion evidence:** Old integrated branches are gone; active branches correspond to real current work. No history rewrite is needed. No branches were deleted during this review.

### R06 — Document infrastructure and releases

**Evidence:** Pages deployment is automated, but [firebase.json](../firebase.json) only selects the rules file and emulator settings; the repository does not describe a complete database deployment/recovery procedure. Firebase resources and anonymous-auth setup depend on console state outside the repository.

**Proposed fix:** Write a compact runbook covering project IDs and region, anonymous sign-in prerequisites, explicit database deployment target, rules publishing, frontend release, rollback limitations, and data export/restore. Record which settings live in GitHub/Firebase consoles and how to recreate them. Check the current plan and establish a modest usage/dependency review cadence. Keep GitHub Pages unless a concrete need justifies a move.

**Completion evidence:** The owner or an agent can distinguish a frontend deploy from a database change and recover from a bad release using documented steps. Reverting frontend code is not presented as restoring database data.

Related: backlog B11, B14, B16. Live Firebase configuration, billing, backups, and rules were not inspected in this review.

### R07 — Improve integration and device coverage

**Evidence:** Current successful CI is valuable, but the game browser suites use the browser-storage backend by default and run in Chromium. Phone-sized viewports do not reproduce Safari, installed-app lifecycle, or actual separate-device networking.

**Proposed fix:** Extend the emulator path to complete games, retaining the faster existing local tests. Add a short real-phone release checklist for background/resume, refresh/rejoin, audio, and installed PWA behavior. Consider WebKit automation as additional coverage. Make failures and useful screenshots/logs easy to retrieve.

**Completion evidence:** Relevant changes are tested through Firebase, and a small representative phone matrix has a reproducible check procedure.

Related: backlog B12 and B13; release gating belongs to R01.

### R08 — Strengthen TypeScript gradually

**Evidence:** Neither [application](../tsconfig.app.json) nor [tooling](../tsconfig.node.json) configuration enables `strict`. Existing unused-symbol checks do not enable strict null checks or implicit-any checks. Firebase's removal of empty containers is already a known source of runtime shape differences in this codebase.

**Proposed fix:** Enable strict checking in manageable steps, especially around backend values and game state, and resolve issues with meaningful types rather than broad assertions or suppressions. Add a clear type-check command if it helps local work; builds already invoke TypeScript.

**Revalidation, 2026-10-27:** The premise was stale. The repo uses TypeScript 6.0, where `strict` is on by default, so implicit-any and null checks already passed; the code has no `any`, `@ts-ignore` or `@ts-expect-error`. Measured extra flags: `noImplicitOverride` 2 errors, `noImplicitReturns` 0, `exactOptionalPropertyTypes` 35, `noUncheckedIndexedAccess` 215 (about 95 in runtime code, the rest in tests).

**Done:** `strict` written explicitly (no longer depends on the compiler default), plus `noImplicitOverride` and `noImplicitReturns`; two `override` modifiers added in `src/App.tsx`.

**Deliberately not enabled:** `exactOptionalPropertyTypes` fights the convention that `field: undefined` in a state patch clears the key (the backend strips `undefined`, see `src/backend/types.ts`); it would force `| undefined` onto most state types for no safety gain. `noUncheckedIndexedAccess` is the one with real value for Firebase-shaped records (`votes[uid]`), but most of its errors are `arr[i]` with a provably valid index, where the only fix is a `!` assertion. Revisit it per module, ideally while splitting modules under R09, and only with real narrowing, not blanket assertions.

**Completion evidence:** Strict checks pass for the agreed scope, and existing rule tests and simulations continue to pass. No claim is made here about how many errors enabling strict mode would reveal.

Reference: [TypeScript strict checking](https://www.typescriptlang.org/tsconfig/strict.html).

### R09 — Clarify the code's boundaries

**Evidence:** `src/game/` mixes shared rooms/types with Uljez rules. Uljez's screen is named `Game.tsx`, other games have more explicit names, and directories use `wave`/`lic` while catalog IDs use `talas`/`licitacija`. Rules UI is mixed into shared components, game screens live separately from their logic, and all CSS is in one 2,268-line file. Misija's screen is 797 lines. Size alone does not mean these files are wrong.

**Proposed fix:** Agree on a small source map: app shell, shared session/backend/history code, shared UI, and a clearly named module per game. Move game-specific rules UI and styles toward their owning game as those files change. Keep shared helpers independent of a particular game's content. Use a registry where it removes repeated branching. Avoid a large rename-only rewrite before useful work.

**Completion evidence:** A new game has a predictable home, shared session code is not mistaken for Uljez code, and adding a game requires fewer unrelated edits.

Related: backlog B07. Coordinate with R10 so reorganizing files actually permits separate loading.

### R10 — Improve loading based on measurements

**Evidence:** [App.tsx](../src/App.tsx) imports every game screen, and shared UI imports game-specific data. There is no measured initial-download baseline or bundle budget in this repository.

**Proposed fix:** Measure a production build, then introduce game loaders and remove shared imports that unnecessarily pull every game's content into startup. Keep external asset dependencies deliberate, including fonts. Verify retry behavior and compatibility with cached older builds before relying on lazy-loaded chunks.

**Completion evidence:** A first visit loads the shell and required game rather than all games, with recorded before/after sizes and working update behavior.

Related: backlog B02, B09, B10. This is an improvement candidate, not a demonstrated loading-performance incident.

### R11 — Set portable maintenance conventions

**Evidence:** There is no `.gitattributes` or `.editorconfig`. This Windows checkout uses global `core.autocrlf=true`, and tracked shell files are checked out with CRLF. Local configuration does not enable automatic fetch pruning. There is no repository formatting policy or dependency-update automation.

**Proposed fix:** Declare text/binary handling in Git, ensure any retained shell scripts use LF, choose lightweight formatting conventions, and record a consistent branch/merge approach. Keep package and lockfile updates together. Use a modest documented cadence or grouped update automation for dependencies and Actions; avoid generating a stream of maintenance work that does not fit this project's size. Local fetch pruning is a convenience, not a prerequisite.

**Completion evidence:** Editing on Windows and Linux does not create line-ending-only churn, and routine dependency updates run through the same checks as other changes.

### R12 — Treat apparent leftovers as compatibility decisions

**Evidence:** Static inspection found no unreachable runtime source files or tracked generated-output clutter. Old `uljez-*` browser-storage keys still save names, room state, sound settings, or local test data. The older Uljez phase recovery and default game behavior are explicit compatibility paths. The `@fontsource` development packages are used by browser tests. The `bsb-igra` repository/site slug and Firebase identifiers are still active infrastructure names.

**Proposed fix:** Identify individual unused exports, CSS selectors, or obsolete compatibility paths with evidence before removing them. Rename legacy storage keys only with a migration or an intentional reset decision. Keep active URLs and Firebase identifiers stable unless a migration has a concrete benefit. Do not remove test fixtures, PWA infrastructure, or font packages just because they are not part of the main screen flow.

**Completion evidence:** Each deletion has a demonstrated reason; returning players do not unexpectedly lose settings or rejoin state. Product branding cleanup is separate from changing infrastructure identifiers.

## Branch audit

GitHub branch heads matched the local remote-tracking references at the time of review. Recheck before deleting anything.

| Branch | Integration evidence |
| --- | --- |
| `claude/big-group-game-m38zda` | Ancestor of `main` |
| `claude/fix-black-screen-j8tjl3` | Ancestor of `main` |
| `claude/fix-random-categories-pgexyv` | Ancestor of `main` |
| `claude/game-music-5uf95u` | Merged PR #1; branch tree exactly equals `8f68fd9` |
| `claude/home-screen-icon-2jarky` | Ancestor of `main` |
| `claude/playthrough-changes-jwlaws` | Ancestor of `main` |
| `claude/project-thread-ydfcku` | Same commit as GitHub `main`, `377de56` |
| `claude/pwa-3aercn` | Merged PR #3; branch tree exactly equals `f91fe87` |
| `claude/rebrand-o17h7d` | Ancestor of `main`; merged PR #2 |
| `claude/second-game-aoswo1` | Ancestor of `main` |
| `claude/sounds-and-music-v5xy12` | Ancestor of `main` |
| `claude/talas-more-scales-mnw0df` | Ancestor of `main` |
| `claude/testing-pyramid-c7eqlt` | Ancestor of `main` |
| `claude/trivia-game-oqxyf3` | Ancestor of `main` |
| `claude/two-player-game-bg27rx` | Ancestor of `main` |
| `claude/uljez-12-vtazgf` | Merged PR #4; branch tree exactly equals `a2f2bf5` |

## Verification and limitations

Inspected tracked files, imports, Git history/configuration, branch ancestry and tree equality, live GitHub branch/PR/settings data, latest job results, and Pages environment configuration. Relevant jobs succeeded on GitHub: [full checks](https://github.com/lorddzzz/bsb-igra/actions/runs/37230010922) and [deployment](https://github.com/lorddzzz/bsb-igra/actions/runs/37230010920).

The full test suite, build, lint, dependency audit, and Firebase emulators were not run locally. No branches, GitHub settings, infrastructure, dependencies, or application code were changed. Only this review and documentation links were added. The snapshot above describes the pre-review commit, not the later state of this living document.
