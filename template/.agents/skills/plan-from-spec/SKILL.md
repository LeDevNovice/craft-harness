---
name: plan-from-spec
description: Draft numbered requirements and a commit-by-commit plan from the specifications, as a proposal the human reviews and adopts — walking skeleton first, then vertical slices, each line one session long with an exact verification, explicit dependencies and touches where lines are independent, human checkpoints at the end of milestones. Use when the human asks for a plan or requirements, or when the plan has no ready line left and the specs describe more work.
---

# Draft a plan from the specifications

You propose; the human disposes. Requirements, specs and the plan's structure are human-owned:
write your draft to `docs/plan/proposals/<YYYY-MM-DD>/` and never edit `docs/requirements.md`,
`docs/specs/**` or the structure of `docs/plan/plan.json`.

1. **Read** `docs/specs/product.md`, `technical.md`, `design.md` if present, `docs/adr/`, `CONTEXT.md`.
   List contradictions and gaps first; if any blocks planning, stop and report them.
2. **Requirements** (`requirements.md`): one testable rule per id, stated as observable behaviour,
   in the product's words, grouped by area. Copy rules the spec already numbers verbatim.
3. **Milestones**: first the repository foundations (only what the profile does not provide), then
   a walking skeleton that crosses the whole chain (build, deploy path, one request end to end,
   observability), then vertical slices a user could try, each ending with an end-to-end check.
   Put operations (alerts, backups) before the first real use. End each milestone with a line
   carrying `humanGate`.
4. **Lines** (`plan.json`, same schema as the real plan): each one session long and reviewable in
   minutes. `message` is the exact Conventional Commit header; `content` says what changes and cites
   requirement ids; `verification` is a command or an observable check, never "it works".
   A line that needs a human action says so and carries `humanGate`.
5. **Parallelism**: give `dependsOn` and `touches` (path globs) only to lines that are genuinely
   independent; otherwise leave them out and the plan stays sequential.
6. **What is left out**: a short `absent.md` — each thing deliberately not built and the
   condition that would make it worth adding.
7. Commit `docs: propose plan <date>` with the trailer of the line in progress (or report without
   committing if none) and stop. The human adopts it with `HARNESS_PLAN_EDIT=1 HARNESS_HUMAN=1`.
