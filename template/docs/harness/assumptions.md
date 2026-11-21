# Harness assumptions register

Every component of the harness encodes an assumption about what the model cannot yet do reliably on
its own. Assumptions go stale as models improve, so each one is written down with the signal that
shows it still holds and the experiment that would let you drop it. Skill `audit-harness` walks this
table; you decide.

| Component | Assumption | Signal it is load-bearing | Experiment to drop or relax it |
| --- | --- | --- | --- |
| One plan line per session, fresh context | Long sessions degrade: context fills, early instructions fade, failed attempts pollute | Lines finished in one session without rework; rework when sessions run long | Run two consecutive small lines in one session on a throwaway branch; compare review findings |
| `status.mjs` at session start | A new session does not know where the work stands | Agent starts on the right line without exploring | Start a session without it; count exploratory tool calls |
| Plan in JSON, agent edits `status`/`notes` only | Agents rewrite or reorder a Markdown task list, declare victory early | `plan-check` refusals; lines skipped or merged | None advised: costs nothing |
| Planned commit message, `Plan:` trailer | Without a fixed unit, scope drifts and history stops being reviewable | `commit-msg` refusals for scope | Relax to "trailer only" for one milestone |
| Test-first loop (skill `implement-line`) | Tests written after code mirror the code, not the requirement | Review finds tests asserting copied values | Compare mutation scores of lines done test-first vs test-after |
| Pre-commit guard on tests and thresholds | Under pressure to pass, agents delete, skip or bend tests | Guard refusals in sessions; special-casing found in review | None advised: reward hacking is measured in current models |
| Requirements check | Without traceability, cited rules go untested | Uncovered ids caught before commit | Drop if review never finds an untested requirement over two milestones |
| Fresh-context reviewer (skill `review-change`) | A model grading its own work approves its own mistakes | `BLOCK` verdicts that led to real fixes | Skip review on `refactor:`/`docs:` lines for a milestone; then on small `feat:` lines |
| Review limited to categories 1–5 | Unbounded review drives over-engineering | Findings stay actionable | Widen categories if real defects reach checkpoints |
| Skill `decide` and `Decision:` lines | Agents pick their first idea silently | Decisions that a reviewer or the human would have challenged | Drop the two-option rule if decisions are consistently sound |
| Human-owned files + agent hook | Agents "fix" a spec or a gate instead of the code | Hook refusals; owned-file guard refusals | None advised: the boundary is the point |
| Stop conditions | Agents push through ambiguity and produce plausible wrong code | Useful stop reports; few false stops | Remove a condition that only produces false stops |
| Human checkpoints | The plan needs product feedback the agent cannot get | Plans changed after a checkpoint | Space checkpoints further apart |
| Parallel lanes off by default | Parallel writers make conflicting implicit decisions | Integration conflicts, rework after merge | Run two declared-independent lines in lanes and measure rework |
| Short `AGENTS.md` (≈ 100 lines) | Long context files lower success and raise cost | Rules followed; none ignored | Move rarely used rules into skills or nested files |
