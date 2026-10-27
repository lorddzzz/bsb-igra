---
name: design-round
description: Run a short, structured decision round for an open product or game-mechanic question, then record the outcome. Use before implementing anything where an open design choice materially changes the work.
---

# Design round

Decide what matters, cheaply, with the owner. Not every choice needs approval: skip this for minor implementation details and pick a sensible default.

## Run it only if
the question is a product or mechanic decision, changes scope or player experience, and is expensive to reverse. If one plausible default exists and being wrong costs little, take it, say so in one line, and move on.

## Steps
1. **Ground yourself.** Read the relevant BACKLOG items, the existing rules or code that this touches, and docs for similar games. Don't ask what the repo already answers.
2. **State the open question.** One or two sentences: what is undecided and why it matters now.
3. **Ask a small batch**, 1-4 questions, with the runtime's question tool (chat if none). Each question gets 2-4 options, a recommended default first with its reason, and a concrete scenario or example ("3 players, round 2, you hold X: what happens?") instead of abstract terms. Group choices that depend on each other; keep independent ones apart. No questions you could answer by reading.
4. **Summarize** the decision in a few lines, separating settled behavior from tunable values (numbers like timers, counts, points: mark them "tune in playtest") and from assumptions you made.
5. **Record it** where it lives: the BACKLOG item (status, decision, date) or a plan in `docs/plans/<feature>-plan.md`. One source of truth; link, don't copy. Keep unresolved questions visible and marked as proposals.
6. **Hand over** a design that is ready for `implement-design` or `add-game`: scope, rules, edge cases, acceptance criteria, and what is explicitly out of scope.

## Quality bar for a game design
Player count range, one-paragraph goal, a turn or phase by phase flow, scoring and win condition, what is secret vs public, how a round ends if someone leaves or stalls, timing, Serbian terms for the UI, how it fits the scoreboard, and what could be unfun (runaway leader, waiting around, one player deciding everything).

## After the round
Mechanics are verified by tests; feel and pacing are verified by the owner's playtest. Don't turn every later choice into a new approval step.
