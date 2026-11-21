---
name: audit-harness
description: Re-examine the agent harness against the assumptions it encodes — for each component in docs/harness/assumptions.md, gather evidence from progress notes, hook refusals and review verdicts on whether it is still load-bearing, then propose removals, simplifications or additions one component at a time. Use when the human switches to a new model or harness version, every few milestones, or when the agent repeatedly fights the same gate.
---

# Audit the harness

Every harness component encodes an assumption about what the model cannot do alone; those
assumptions go stale as models improve. Remove one component at a time, on evidence — a radical cut
makes it impossible to tell which part was load-bearing.

1. Read `docs/harness/assumptions.md` (one row per component: assumption, signal, test to drop it).
2. Gather evidence from the repository, not from impressions:
   - `docs/plan/progress/*.md`: stop conditions hit, review findings, rework;
   - `git log --grep "Decision:"`, `git log --grep "^fix"`: what went wrong after review;
   - checkpoint reports in `docs/plan/checkpoints/`;
   - what the human reported about refusals by hooks.
3. For each component, classify: **load-bearing** (it caught real problems), **idle** (never
   triggered and the model behaves without it), **harmful** (costs tokens or blocks valid work), or
   **missing** (a recurring failure no component addresses).
4. For an idle component, propose a cheap experiment: run the next one or two lines on a throwaway
   branch without it and compare with the same evidence. Never disable a gate on `main` yourself.
5. Write `docs/plan/audits/<YYYY-MM-DD>.md`: model and harness versions, table of components with
   classification and evidence, proposals ranked by expected effect, experiments to run.
6. Commit `docs: audit harness <date>` (trailer of the line in progress, or report without
   committing) and stop. Changes to the harness itself are made by the human.
