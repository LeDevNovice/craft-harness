# ADR-0005 — Sequential by default, opt-in parallel lanes

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Parallel writers make conflicting implicit decisions (Cognition); coding is less parallelizable than research (Anthropic). Some lines are nevertheless independent.

## Decision
A plan without `dependsOn` is a strict chain. Lines with `dependsOn` and disjoint `touches` may run in lanes: one worktree and one writer each, integrated one at a time with every gate re-run on the merged tree; conflicts and red merges are aborted, never forced.

## Options rejected
- Agent teams with shared files: no isolation, conflicting edits.
- Swarms: unstructured negotiation, little adoption in practice.

## Consequences
The human must judge independence when writing the plan.

## Revisit if
Integration rework stays near zero over several milestones of lanes, or harnesses ship reliable conflict-free coordination.
