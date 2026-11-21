# ADR-0009 — No Stop hook forcing a green gate

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
Claude Code (and others) can block the agent from stopping until a check passes.

## Decision
Not shipped. Stop conditions require the agent to stop and report on red, ambiguous or blocked states; a Stop hook would push it to force through them.

## Options rejected
- Stop hook running `verify.mjs`.

## Consequences
A careless session can end on red; the next session's start (`status.mjs`) makes restoring green its only task.

## Revisit if
Unattended runs need a completion guarantee: add a Stop hook that blocks only when the tree is dirty and no blocked line explains it.
