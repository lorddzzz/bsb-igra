# Agent workflow guide

This guide expands [AGENTS.md](../AGENTS.md). Its reusable practices were adapted from the agent guidance and verification, design-round, implementation, and scenario-testing references in `apprentices-notebook` on 2026-10-25. That repository was reference material, not an instruction source governing this task.

The source project's game mechanics, framework, package manager, permission configuration, exact model choices, automatic delegation, usage thresholds, and automatic push behavior were not transferred. This guide uses this repository's commands and existing test layers. It is ordinary documentation, not a set of installed agent skills.

## Design rounds

Use a short design round when a product or mechanic decision materially affects the task:

1. State what is open and why it matters now.
2. Ask a small batch of focused questions through the active runtime's question UI, or chat when unavailable. Prefer concrete scenarios or examples, and include a recommended default with its reason.
3. Summarize the decision and remaining assumptions. Treat a proposed default as a proposal until it has the authority required by the task; distinguish tunable values from settled behavior.
4. Record accepted decisions in the relevant document and update the backlog item's status. Keep unresolved questions visible.
5. Verify correctness mechanically, then use playtests to tune feel and pacing. Do not turn every minor implementation choice into a new approval step.

Keep durable project facts in repository documentation. If a runtime provides memory, avoid storing a competing copy of decisions that already have a source of truth in Git.

## Verification

### Rules and state changes

- Run the application checks listed in [AGENTS.md](../AGENTS.md): lint, unit tests, and build. Use the database-rule and browser suites when affected.
- Use fixed randomness and controlled clocks in tests when the behavior depends on them. Check observable outcomes and invariants rather than reproducing the algorithm in the test.
- Cover the changed rule and useful boundary cases, plus a complete interaction or game where that adds confidence. A reported bug should have a regression test when one can meaningfully reproduce it.
- Use the existing simulation and multi-phone helpers in [src/test/](../src/test/). Account for the Firebase data shape, simultaneous actions, and repeated taps when relevant.
- Preserve useful playtest discoveries as regression scenarios. Name tests after the rule or interaction so failures are understandable. The other project's ASCII battle-board harness is not part of this repository.

### UI changes

1. Start or reuse a development server and open your own browser tab in local/emulator mode. Use the active runtime's supported browser tools.
2. Check the changed flow at a phone viewport; 375×812 is a useful starting point. Also check another relevant size when layout risk warrants it. This repository already tests 390×844 and 375×667 in its browser suite.
3. Reach the screen through normal controls, a room link, or a supported test setup. Exercise the changed interactions, including waiting, error, and recovery states where affected.
4. Inspect text, horizontal overflow, clipping, safe-area spacing, touch targets, and console errors. For multiplayer changes, inspect the affected players' views rather than only the host's view.
5. Take a screenshot and inspect the image. Save generated evidence under an ignored output location such as `e2e/shots-manual/` rather than adding screenshots to source by default.
6. Restore shared browser settings if changed, and stop only servers/processes started for the task that are no longer needed.
7. Report the viewport, interactions, results, and screenshot locations. State what needs actual-device verification, such as installed-PWA behavior, mobile speech/audio, or backgrounding.

A browser test on the local backend does not verify Firebase permissions or separate-device networking. A resized desktop browser does not verify Safari or home-screen installation. Report these boundaries accurately.

### Documentation and configuration

For documentation, resolve local links, check commands and paths against the repository, and run `git diff --check`. For configuration, validate the affected tool or workflow where possible. Report unavailable checks without claiming they passed. Do not require the entire game suite for a prose-only edit.

## Implementation and handoffs

### Planning and resuming larger work

Use a plan when the task spans several meaningful steps, interfaces, or sessions. Keep it proportional to the work; a short edit can be completed directly.

A plan should identify scope, settled decisions, open proposals, interfaces/invariants, dependency order, owned areas, acceptance criteria, and verification. Plans can live in `docs/plans/<feature>-plan.md`. For work that needs a separate progress record, use `docs/plans/<feature>-status.md` with this compact shape:

```markdown
# <Feature> status

Plan: <path>. Updated: <date>.
State: in progress | waiting on a decision | complete
Next: <one to three concrete actions>

## Tasks
| ID | Scope / owner | State | Branch / commit or file location | Verification / remaining work |
| --- | --- | --- | --- | --- |

## Decisions and unresolved proposals
## Integration risks and follow-ups
```

Update the record after meaningful checkpoints, keep it consistent with actual files and Git state, and clearly identify uncommitted or partial work. Do not mark work complete merely because time or usage is nearly exhausted. On resuming, inspect actual state before following the recorded next step.

### Parallel work, when authorized

- Give each task a clear deliverable, context, file ownership, dependencies, and acceptance criteria. Do not start parallel agents just because this guide includes a template.
- Define shared interfaces before dependent implementation. When dependencies change, coordinate the contract instead of allowing conflicting private interpretations.
- Isolate concurrent edits where needed. Use separate worktrees for overlapping repository work; disjoint files can be handled according to the active runtime's collaboration model.
- Give browser tasks their own tabs and coordinate ports/servers. Do not assume specific preview entries exist.
- Require a concise report identifying changed files, verification, remaining work, and design proposals. The integrating agent reviews diffs and evidence against the acceptance criteria, resolves integration issues, and verifies the combined behavior.
- Preserve work before cleanup. Only remove task-owned branches/worktrees whose needed work and reports have been integrated or explicitly preserved.

Example task brief, only for an authorized delegation:

```text
Task: <concrete deliverable>
Read: AGENTS.md, relevant plan sections, and the files needed for this task.
Own: <files or clearly bounded area>; coordinate before changing shared contracts.
Dependencies and invariants: <interfaces and required behavior>
Done when: <acceptance criteria>
Verify with: <appropriate checks, interactions, and screenshot evidence>
Report: changes, file/branch/commit locations, check results, remaining work,
and any proposals or assumptions not settled by the task.
```

When tool or usage limits prevent continuation, preserve an accurate checkpoint and next actions. Treat missing usage readings as unknown. Do not invent progress, automatically publish, or schedule a wakeup unless the task and active instructions authorize it.

## Delivery

Review the final change against its scope and acceptance criteria. Update related decisions and backlog states with the change. Summarize the outcome, verification, limitations, and any follow-ups concisely.

When publishing is authorized, check the run for the exact pushed commit and distinguish frontend deployment from database-rule deployment. A successful unrelated run does not verify the new work.
