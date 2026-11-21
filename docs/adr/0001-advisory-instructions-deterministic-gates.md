# ADR-0001 — Advisory instructions, deterministic gates

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Agents mostly follow instructions; "mostly" is not enough for tests, plan order or the rules themselves. Vendors and the AAIF state that context files are guidance and that enforcement belongs in hooks, CI and branch protection.

## Decision
Two layers. `AGENTS.md` and skills say what to do. Git hooks, `scripts/harness/*` and CI refuse what must never happen, independently of the harness and the prompt. Harness hooks only refuse earlier.

## Options rejected
- Instructions only: an agent under pressure can delete or bend a test (ImpossibleBench).
- Harness hooks only: each harness has its own surface and bugs; a human or another tool bypasses them.

## Consequences
Some valid work is refused and needs a human override; the audit measures that friction.

## Revisit if
Harness-level enforcement becomes uniform and reliable across harnesses and is also applied server-side.
