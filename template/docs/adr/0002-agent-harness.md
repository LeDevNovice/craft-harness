# ADR-0002 — Build with coding agents inside a deterministic harness

- **Status**: Accepted
- **Date**: (commit 0)
- **Sources**: `docs/harness/README.md`, `docs/harness/assumptions.md`

## Decision
Coding agents implement the plan one line per session, test-first. Short instructions
(`AGENTS.md`, skills) guide them; deterministic gates (git hooks, harness scripts, CI) decide.
Specs, requirements, ADRs, the plan's structure and the harness itself are human-owned. A reviewer
that did not write a change checks every behaviour change. Parallel lanes only for lines declared
independent, integrated one at a time.

## Options rejected
- Instructions only: advisory; an agent under pressure to pass can delete or bend a test.
- One long agent session per feature: context degrades; no clean handoff; no reviewable unit.
- Parallel agents by default: conflicting implicit decisions; integration cost exceeds the gain on
  most software tasks.

## Consequences
Every commit is small, reviewed and traceable to a requirement. Some valid work is refused by a
gate and needs a human override: that friction is the price, and the audit measures it.

## Revisit if
`audit-harness` shows a component idle or harmful over two milestones, or a new model or harness
makes one of the assumptions in `docs/harness/assumptions.md` false.
