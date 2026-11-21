# ADR-0010 — One progress note per plan line

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Deux Places' single `PROGRESS.md` reached ~240 KB; parallel lanes appending to one file conflict.

## Decision
`docs/plan/progress/<id>.md`, written in the commit that finishes or blocks the line; `status.mjs` shows the last three.

## Options rejected
- One log with a union merge driver: still grows without bound.

## Consequences
More files in `docs/plan/progress/`.

## Revisit if
Never needed so far.
