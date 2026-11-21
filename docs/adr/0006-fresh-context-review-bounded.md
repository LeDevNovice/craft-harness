# ADR-0006 — Fresh-context review, bounded

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Models approve their own work; clean-context reviewers find more; unbounded review drives over-engineering.

## Decision
Skill `review-change` with five categories, a failing case per finding and a PASS/BLOCK verdict. Its input is built by `review-prompt.mjs` (diff, line, exact requirement text) so it runs as a subagent or headless in any harness.

## Options rejected
- Self-review in the implementing session.
- Unbounded "find issues" review.

## Consequences
One extra model call per behaviour change.

## Revisit if
`audit-harness` shows the reviewer rarely finds real defects on some line types (drop it for those first).
