---
name: implement-line
description: Implement exactly one plan line test-first — test list, red-green-refactor one test at a time, explicit decisions, verification with evidence, fresh-context review, progress note and a single commit. Use after start-session for the next ready line, or inside a parallel lane for that lane's line.
---

# Implement one plan line

## 1. Understand
- Read the line (`message`, `content`, `verification`, `touches` if any), the exact text of every
  requirement it cites in `docs/requirements.md`, and the spec sections it names. Use `CONTEXT.md`
  names in code; a new domain term goes into `CONTEXT.md` first (same commit).
- Set its status to `in_progress` in `docs/plan/plan.json` — only that field.
- Write a **test list** in your working notes: observable behaviours, edge cases, the requirement
  wording, at least one case that must be rejected. Not implementation steps.
- If the line touches files outside its `touches`, or looks wrong, stop and report.

## 2. Tidy first, only if needed
If the existing structure makes the change hard, restructure first in a separate `refactor:` commit
(trailer `Plan: <id>a`): no behaviour change, all tests green before and after.

## 3. Red → green → refactor, one test at a time
- Write one test. Run it. It must fail **for the reason you expect** — read the failure message.
  A test that passes at once is redundant or wrong: find out which.
- Write the minimum code that passes it and every previous test. No speculative parameters.
- Refactor only while green; never mix refactoring into making a test pass.
- Derive expected values from the requirement, never by copying what the code returns.
- Add newly discovered cases to the list; repeat until it is empty.
- A test that contradicts a requirement: stop and report. Never edit it or special-case its inputs.

## 4. Decide explicitly
Any choice the line, specs or ADRs leave open → skill `decide`, recorded as `Decision:` in the
commit body. Structural choices (new dependency, layer, cross-module pattern) → stop and report.

## 5. Verify with evidence
- `node scripts/harness/verify.mjs`, then the line's own verification (integration test, end-to-end
  run, screenshot compared with the design, or a manual step written for the human).
- Paste the relevant output in your report. "Should work" is not evidence.

## 6. Review in a fresh context (behaviour changes)
`git add -A`, then have a reviewer that has not seen this session check the change with skill
`review-change`: a subagent given only `node scripts/harness/review-prompt.mjs` output, or a headless
run (`node scripts/harness/review-prompt.mjs | claude -p`, `| codex exec -`). Fix findings in
categories 1–4; ignore taste and "might need". Re-review after a fix that changed behaviour.

## 7. Commit
- `plan.json`: status `done` — or `blocked` with a `notes` reason, and then commit no code.
- Write `docs/plan/progress/<id>.md`:
  ```
  # <id> · <done|blocked> · <YYYY-MM-DD>
  Done: what changed, in two to five lines.
  Evidence: commands run and their key output.
  Review: verdict and what was fixed.
  Decisions: the Decision lines, or "none".
  Follow-ups: what the human should know or do.
  ```
- `git add -A && git commit` with the planned message, a why-body, `Decision:` lines if any, and
  the trailer `Plan: <id>`. If a hook refuses, fix the cause; never bypass.
- End the session. The next line starts in a fresh context.
