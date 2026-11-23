# ADR-0002 — Open standards as the single source

- **Status**: Accepted, amended by [ADR-0012](0012-gemini-cli-hook-adapter.md) (no `.gemini/skills` link)
- **Date**: 2026-11-21

## Context
`AGENTS.md` (AAIF) and Agent Skills (`SKILL.md`, AAIF) are read by most harnesses; tool-specific files multiply and drift.

## Decision
`AGENTS.md` and `.agents/skills/` are the only sources. Adapters are thin: `CLAUDE.md` imports `AGENTS.md`; `.claude/skills` and `.gemini/skills` are symlinks. Skills use standard frontmatter only.

## Options rejected
- One file per tool: duplicated rules drift.
- `AGENTS.md` fallback alone for Claude Code: applies only without `CLAUDE.md` and leaves no place for Claude-specific notes.

## Consequences
Windows checkouts may lose symlinks: `install.mjs` repairs them.

## Revisit if
A harness stops reading the standards, or the standards change paths.
