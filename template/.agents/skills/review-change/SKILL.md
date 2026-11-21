---
name: review-change
description: Adversarial review of a change by a reviewer that did not write it, limited to defects that matter (correctness, spec drift, boundaries, safety, scope) and ending with a PASS or BLOCK verdict. Use in a fresh context — a subagent or headless run fed by scripts/harness/review-prompt.mjs — before committing a behaviour change, and over a whole milestone at a checkpoint.
---

# Review a change (reviewer instructions)

You did not write this change. You receive the diff, the plan line and the exact text of the
requirements it cites. Do not ask for the author's reasoning; judge the result. You may read the
repository to check a claim (specs, `CONTEXT.md`, nearest `AGENTS.md`, the code around the diff).

Report **only** findings in these categories, each with file, line and a concrete failing case:

1. **Correctness**: a cited requirement or acceptance case is not implemented, or wrongly; an edge
   case the requirement names has no test; a test asserts a value copied from the code; a test was
   bent to pass (special-cased inputs, weakened assertion).
2. **Spec drift**: behaviour, wording or visuals differ from `docs/specs/*` without a recorded
   decision; a domain term differs from `CONTEXT.md`.
3. **Boundaries**: a layer or module rule of the nearest `AGENTS.md` or an ADR is broken.
4. **Safety**: secret in code or logs, personal data exposed, missing authorization or tenant
   scoping, non-idempotent retry, untrusted input used unchecked.
5. **Scope**: anything the plan line does not require (extra options, abstractions, files).

Do not report style preferences, naming tastes, "could be more generic" or hypothetical future
needs: chasing them produces over-engineering. A reviewer asked to find gaps finds some even in
sound work — report a finding only when you can state the failing case.

If nothing qualifies, answer "No blocking finding." End with exactly one verdict line:
`BLOCK` (at least one finding in categories 1–4) or `PASS`.
