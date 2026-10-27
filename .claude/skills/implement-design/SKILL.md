---
name: implement-design
description: Fully implement an approved design end to end as an orchestrator. Plan, split into tasks, delegate to subagents with the cheapest adequate model, respect the usage budget, integrate, test, review, and ship. Use for multi-step or multi-file work such as a new game or a feature; not for small edits.
---

# Implement a design

You are the orchestrator. Your context is the scarcest resource: keep it for decisions, contracts and integration, and push bulk work to subagents with focused briefs. Follow AGENTS.md throughout. Use `add-game` for new games, `verify-change` and `verify-ui` for checks, `design-round` if a design gap appears.

If there is no approved design (BACKLOG status "Agreed direction" or a decision recorded in `docs/plans/`), stop and run `design-round`. A backlog suggestion is not approval.

## 1. Intake
- Read the design, the AGENTS.md, and the code it touches. Check `git status`, branches and `docs/plans/` for in-flight work; resume rather than restart (see Resuming).
- Define scope, explicit non-goals, acceptance criteria, and open proposals. If an open decision materially changes the work, ask now with a recommended default; otherwise state your assumption and go on.

## 2. Plan (`docs/plans/<feature>-plan.md`)
Keep it proportional: a page. Contents: scope, settled decisions, proposals, shared interfaces and invariants, tasks, dependency order, file ownership per task, acceptance criteria, verification per task. Each task gets: deliverable, files owned, depends on, difficulty tier (below), acceptance check.

Order work **contracts first**: types, state shape, phase names, function signatures and the Firebase data shape. Write these yourself (or have one strong-tier agent do it) before anything depends on them. Parallel agents must never invent private versions of a shared contract.

Typical split for a game: (A) types + `logic.ts` + logic tests; (B) `room.ts` + room and sim tests, after A's contract; (C) content in `src/data/` + content tests, independent; (D) screen + rules text + screen tests, after A's contract; (E) integration: catalog, App routing, history, e2e script, docs. A, then B/C/D in parallel, then E.

Create `docs/plans/<feature>-status.md` (format below) and keep it true.

## 3. Budget and model choice
Spend the cheapest thing that will pass the acceptance check; escalate only on evidence.

| Tier | Model (Agent `model`) | Use for |
| --- | --- | --- |
| Light | `haiku` | search and file mapping, running checks and summarizing output, mechanical edits, content lists to a clear spec, docs link checks |
| Standard | `sonnet` | most implementation: logic, room actions, screens, tests following an existing pattern |
| Heavy | `opus` | contracts and state design, tricky concurrency or Firebase-shape issues, cross-cutting refactors, integrated review, anything that already failed twice at a lower tier |

Rules: you, the orchestrator, do not do bulk work yourself. Prefer fresh agents with a tight brief over forks, which carry your whole context. Escalate a task one tier after a failed attempt with the failure attached, never retry the same tier blindly. Don't use Heavy to review Light's trivial output; do use an independent reviewer for the integrated diff of non-trivial work.

**Usage.** Check what is available before fanning out (the runtime's usage readout, e.g. `/usage` or what the environment exposes). If you cannot read it, treat it as unknown: say so, favor Light/Standard tiers, run at most 2 agents at once, and checkpoint after every task. Proposed defaults, tunable by the owner:
- plenty left (over ~50%): up to 3-4 parallel agents, Heavy where warranted;
- moderate (~20-50%): at most 2 in parallel, no Heavy except contracts and final review, shorter briefs;
- low (under ~20%) or a limit warning: finish only the task in flight, write the status checkpoint, tell the owner exactly what is left, stop. Never start a big task you cannot finish, never compress verification to fit, never mark work done to save budget.
Re-check usage between waves, not constantly.

## 4. Delegate
Use the `Agent` tool (background, so you can continue); if the runtime has no subagents (e.g. Codex), run the tasks yourself in dependency order with the same briefs.

Brief template (copy, fill, send; subagents don't see this conversation):
```text
Task: <one concrete deliverable>
Context: read AGENTS.md, <plan path> sections <x>, and these files: <list>.
Own: <files you may edit>. Do not edit anything else; if you need a change in a shared contract, stop and report it.
Contract: <exact types/signatures/state shape/phases to build against>
Done when: <acceptance criteria, including tests that must pass>
Verify with: <exact commands, e.g. npx vitest run src/foo>; report real output.
Constraints: no commits or pushes, no unrelated changes, Serbian Latin copy, no new dependencies.
Report in the handoff format (references/handoff.md): changed files, checks run and results, remaining work, assumptions and proposals.
```
- Disjoint files: run in parallel in one tree. Overlapping files or risky work: `isolation: "worktree"`, one branch per task (`feat/<feature>-<part>`). Browser tasks get their own tab and port.
- Give each agent the narrowest context that suffices; ask for concise reports, not transcripts.
- Don't poll. You are notified when an agent ends. Meanwhile do your own non-overlapping work (e.g. the contracts for the next wave).

## 5. Integrate
- Review each report against its acceptance criteria and **read the actual diff**, not just the claim. Reject and re-delegate (escalating tier if needed) rather than silently patching large defects; patch small ones yourself.
- Merge worktree branches in dependency order, resolve conflicts, then run the full checks on the combined result: `verify-change`, plus `verify-ui` on each new screen and the e2e for the game. Subagent success on pieces is not integration success.
- Tests are part of the process, not a final step: every task ships with its tests (`references/game-tests.md`). Add multi-phone and e2e coverage during integration.

## 6. Review
Spawn an independent reviewer (fresh agent, Heavy tier for non-trivial work, or the `code-review` skill) on the integrated diff against the design and acceptance criteria. It looks for rule bugs, Firebase shape and concurrency issues, missing states, copy and diacritic errors, and scope creep. Fix what it finds, re-run checks.

## 7. Ship
Update docs, BACKLOG status (decision, date, implementation reference, how verified), and mark the status file complete. Commit following AGENTS.md (straight to `main` by default, explicit paths, descriptive message), push only when that is within the task, then check CI and deploy for that exact commit. Clean up task-owned worktrees and branches after their work is integrated. Final handoff per `references/handoff.md`, including what needs the owner's playtest.

## Status file (`docs/plans/<feature>-status.md`)
```markdown
# <Feature> status
Plan: <path>. Updated: <date>. Usage when written: <reading or unknown>.
State: in progress | waiting on a decision | complete
Next: <one to three concrete actions>

## Tasks
| ID | Scope / owner (tier) | State | Branch / commit / files | Verification / remaining |
| --- | --- | --- | --- | --- |

## Decisions and unresolved proposals
## Integration risks and follow-ups
```
Update at every checkpoint (task done, wave done, before stopping). Mark uncommitted or partial work explicitly.

## Resuming
Before continuing from a status file, reconcile it with reality: `git status`, `git log`, branches and worktrees, and whether the files each task claims exist and the tests pass. Trust the files over the notes, fix the notes, then continue from the first unfinished task.

## Don'ts
Don't parallelize tasks that share files or an undefined contract. Don't let subagents commit, push or touch live Firebase. Don't expand scope because the plan mentions something. Don't report done without running the checks yourself. Don't equate green simulations with a good game: say what needs playtesting.
