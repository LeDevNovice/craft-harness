# ADR-0008 — Assumptions register and harness audits

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Every harness component encodes an assumption about model limits; Anthropic removed components one at a time as models improved.

## Decision
Each generated project carries `docs/harness/assumptions.md` (assumption, signal, experiment to drop) and skill `audit-harness`, which classifies components on repository evidence and proposes one change at a time.

## Options rejected
- Fixed harness: accumulates dead weight.
- Periodic rewrite: loses which parts were load-bearing.

## Consequences
Audits cost a session now and then.

## Revisit if
Never: the register is the mechanism that revisits the other decisions.
