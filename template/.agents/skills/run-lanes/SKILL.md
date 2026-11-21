---
name: run-lanes
description: Orchestrate parallel lanes — find plan lines whose dependencies are done and whose declared touches are disjoint, give each its own git worktree and one implementing agent in a fresh context, then integrate the lanes one at a time with full verification. Use when the human asks for parallel work and lanes.mjs ready lists more than one line; otherwise work sequentially.
---

# Run parallel lanes (orchestrator instructions)

Parallelism pays only for independent work. Writes stay single-threaded per lane; you, the
orchestrator, never write product code — you start lanes, watch them, and integrate.

1. `node scripts/harness/lanes.mjs ready`. One line → work sequentially (skill `start-session`).
   Lines without `touches`, with a `humanGate`, or overlapping a running lane are never parallel.
2. For each listed line: `node scripts/harness/lanes.mjs start <id>`. It creates a worktree on
   branch `lane/<id>` outside the repository.
3. Run one implementing agent per lane, each started **in its lane directory with a fresh context**
   (a subagent, a background session, or a separate terminal) with this brief only:
   > Work in <lane path>. Apply skill `start-session`, then `implement-line` for <id> only.
   > Stay inside its `touches`. Stop and report on any stop condition of AGENTS.md.
4. Read-only helpers (codebase search, documentation lookup, review) may run in parallel freely.
5. Integrate in plan order, one lane at a time, from the base branch:
   `node scripts/harness/lanes.mjs finish <id>`. It merges, runs `verify.mjs` on the merged tree and
   aborts on conflict or red. On abort: send the lane agent back to merge the base branch into its
   lane, fix, verify and commit; then finish again. Never resolve a lane's logic yourself.
6. A lane that stopped on a stop condition stays open; report it to the human with the lane's
   progress note. Do not reassign its line.
7. When every lane is integrated, run `node scripts/harness/status.mjs` and report.
