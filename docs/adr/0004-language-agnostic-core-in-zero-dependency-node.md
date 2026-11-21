# ADR-0004 — Language-agnostic core in zero-dependency Node

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
The harness must work for any stack, run in hooks on every commit, and be auditable.

## Decision
Harness scripts are Node ≥ 22 ES modules with no dependencies, configured entirely by `harness.config.json`. Profiles change data and add stack files; the TypeScript profile is shipped.

## Options rejected
- POSIX shell: JSON and diff parsing become fragile.
- Python: Copier already needs it, but most projects using this template are JS/TS and Node is ubiquitous.
- A compiled binary: opaque to the human who owns it.

## Consequences
Non-JS projects need Node installed for the harness.

## Revisit if
A user base on stacks where installing Node is a burden.
