# Handoff format

Used for subagent reports and for the final report to the owner. Short, factual, no transcripts.

```text
Outcome: <what is now true; done | partial | blocked>
Changed: <files or areas; branch/commit if any>
Verified: <commands run and results; for UI the viewport, interactions, screenshot paths>
Not verified: <what could not run or only a human or real device can confirm>
Decisions made: <choices taken, with reason; mark proposals not yet approved>
Remaining / risks: <known gaps, follow-ups, integration risks>
Next: <the exact next action if unfinished>
```

Rules: report failures with the relevant output, never "should work". Separate tunable values from settled behavior. Name uncommitted or partial work. Treat an unknown usage reading as unknown. Don't invent progress.
