---
name: implement-design
description: Fully implement an approved design end to end as an orchestrator. Plan, split into tasks, delegate when authorized using the cheapest adequate model, respect the usage budget, integrate, test, review, and ship. Use for multi-step or multi-file work such as a new game or a feature; not for small edits.
---

# Implement a design

You are responsible for decisions, contracts and integration. When delegation is authorized, give subagents focused briefs and keep their reports concise. Follow AGENTS.md throughout. Use `add-game` for new games, `verify-change` and `verify-ui` for checks, `design-round` if a design gap appears.

If there is no approved design (BACKLOG status "Agreed direction" or a decision recorded in `docs/plans/`), stop and run `design-round`. A backlog suggestion is not approval.

## 1. Intake
- Read the design, the AGENTS.md, and the code it touches. Check `git status`, branches and `docs/plans/` for in-flight work; resume rather than restart (see Resuming).
- Define scope, explicit non-goals, acceptance criteria, and open proposals. If an open decision materially changes the work, ask now with a recommended default; otherwise state your assumption and go on.

## 2. Plan (`docs/plans/<feature>-plan.md`)
Keep it proportional: a page. Contents: scope, settled decisions, proposals, shared interfaces and invariants, tasks, dependency order, file ownership per task, acceptance criteria, verification per task. Each task gets: deliverable, files owned, dependencies, role (below), size (S/M/L), acceptance check, and verification.

Order work **contracts first**: types, state shape, phase names, function signatures and the Firebase data shape. Handle this yourself when small or when it needs close iteration; otherwise, when delegation is authorized, use a Strong agent. Require a handoff of public interfaces, invariants and integration risks, review it against downstream tasks, and integrate it before dependent work starts. Parallel agents must never invent private versions of a shared contract. Start each task as soon as its dependencies are integrated; a wave need not be a barrier.

Typical split for a game: (A) types + `logic.ts` + logic tests; (B) `room.ts` + room and sim tests, after A's contract; (C) content in `src/data/` + content tests, independent; (D) screen + rules text + screen tests, after A's contract; (E) integration: catalog, App routing, history, e2e script, docs. Integrate A’s contract first; B, C and D can then proceed as their dependencies allow, followed by E. Parallelize only when authorized.

Create `docs/plans/<feature>-status.md` (format below) and keep it true.

## 3. Budget and model choice
Choose the least expensive role suited to the task, using the active runtime's model and effort controls. When a model is unavailable, use the closest available option and record the substitution.

| Role | Claude option | Codex option | Use for |
| --- | --- | --- | --- |
| Strong | Opus 5.5 Medium | Sol 6.1 High (`gpt-6.1-sol`, `high`) | Shared contracts, difficult Firebase or concurrency issues, cross-cutting refactors and hard algorithms |
| Medium | Sonnet 5.5 High | Sol 6.1 Medium (`gpt-6.1-sol`, `medium`) | Game logic, room actions, screens, debugging, substantive tests and review |
| Fast | Haiku 5.5 High | Luna 6 Max (`gpt-6-luna`, `max`) | Precise-spec content, mechanical edits, checks, log inspection and fact gathering |

For delegated planning, use Opus 5.5 High or Sol 6.1 High (`gpt-6.1-sol`, `high`); this overrides the Claude Strong default. Legacy plan tiers Heavy/Standard/Light map to Strong/Medium/Fast. For Codex model overrides, use `fork_turns: "none"` and a standalone brief. Apply mappings to new agents; don't restart running agents just to change models. Respect the active runtime's delegation and model-override rules.

After two failed reviews, escalate one role with the attempt's branch or file location and review notes. If already Strong, reassess the contract or task split before retrying. Use an independent reviewer for a non-trivial integrated diff when delegation is authorized.

**Usage.** Check what is available before fanning out (the runtime's usage readout, e.g. `/usage` or what the environment exposes). If you cannot read it, treat it as unknown: say so, favor Fast/Medium roles, run at most 2 agents at once, and checkpoint after every task. Proposed defaults, tunable by the owner:
- plenty left (over ~50%): up to 3-4 parallel agents, Strong where warranted;
- moderate (~20-50%): at most 2 in parallel, no Strong except contracts and final review, shorter briefs;
- low (under ~20%) or a limit warning: finish only the task in flight, write the status checkpoint, tell the owner exactly what is left, stop. Never start a big task you cannot finish, never compress verification to fit, never mark work done to save budget.
Re-check usage between waves, not constantly.

## 4. Delegate
Delegate only when authorized by the task and active runtime instructions. Use the runtime’s supported subagent tools; if delegation is unavailable or not authorized, do the work yourself in dependency order with the same acceptance criteria.

Brief template (copy, fill, send; make it standalone when the agent does not inherit the conversation):
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
Review the integrated diff against the design and acceptance criteria. When delegation is authorized, use an independent reviewer (a fresh Strong agent for non-trivial work, or the `code-review` skill if available). It looks for rule bugs, Firebase shape and concurrency issues, missing states, copy and diacritic errors, and scope creep. Fix what it finds, re-run checks.

## 7. Ship
Update docs, BACKLOG status (decision, date, implementation reference, how verified), and mark the status file complete. Commit following AGENTS.md (straight to `main` by default, explicit paths, descriptive message), push only when that is within the task, then check CI and deploy for that exact commit. Clean up task-owned worktrees and branches after their work is integrated. Final handoff per `references/handoff.md`, including what needs the owner's playtest.

## Status file (`docs/plans/<feature>-status.md`)
```markdown
# <Feature> status
Plan: <path>. Updated: <date>. Usage when written: <reading or unknown>.
State: in progress | waiting on a decision | complete
Next: <one to three concrete actions>

## Tasks
| ID | Scope / role / model / effort | Size | State | Branch / commit / files | Verification / remaining |
| --- | --- | --- | --- | --- | --- |

## Decisions and unresolved proposals
Record each new rule or design proposal, its reason, and whether it was accepted or needs a decision.
## Integration risks and follow-ups
```
Update at every checkpoint (task done, wave done, before stopping). Mark uncommitted or partial work explicitly.

## Resuming
Before continuing from a status file, reconcile it with reality: `git status`, `git log`, branches and worktrees, and whether the files each task claims exist and the tests pass. Trust the files over the notes, fix the notes, then continue from the first unfinished task.

## Don'ts
Don't parallelize tasks that share files or an undefined contract. Don't let subagents commit, push or touch live Firebase. Don't expand scope because the plan mentions something. Don't report done without running the checks yourself. Don't equate green simulations with a good game: say what needs playtesting.
