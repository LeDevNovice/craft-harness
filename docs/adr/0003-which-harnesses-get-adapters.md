# ADR-0003 — Which harnesses get adapters

- **Status**: Accepted, amended by [ADR-0011](0011-deepseek-harness-through-the-standards.md) (DeepSeek Harness) and [ADR-0012](0012-gemini-cli-hook-adapter.md) (Gemini CLI); revisit condition met for Copilot (#3)
- **Date**: 2026-11-21

## Context
Adapters add session-start context, earlier refusals and reviewer subagents. Maintaining one per harness costs; correctness must not depend on any.

## Decision
First-class by default: Claude Code, Codex, DeepSeek Harness. Selectable: Cursor (uses the Claude Code hook file), Gemini CLI (settings + skills link), GitHub Copilot (standards only). One `agent-hook.mjs` understands Claude Code, Codex and Cursor payloads. Details: `docs/harness-support.md`.

## Options rejected
- Every harness first-class: more files, little gain where hooks are missing or buggy.
- Claude Code only: excludes open runtimes and the AGENTS.md originator.

## Consequences
Copilot and Gemini users get refusals only at commit time.

## Revisit if
A selectable harness ships reliable project-level pre-tool-use hooks, or a default one loses them.
