# ADR-0011 — DeepSeek Harness supported through the standards

- **Status**: Accepted (amends ADR-0003)
- **Date**: 2026-11-22

## Context
ADR-0003 made DeepSeek Harness first-class through its Claude Code hooks bridge. Checked against its source (`packages/experimental/hooks-claude-code`, #2): the bridge is experimental and opt-in, its `configPath` is read once per process with no per-project discovery, matchers run against DeepSeek's own tool names (`bash`, `str_replace_editor`), and session-start context comes only from JSON `additionalContext`. The generated `.claude/settings.json` did nothing there.

## Decision
DeepSeek Harness moves to "supported through the standards": it reads `AGENTS.md` and `.agents/skills` natively, the agent runs `status.mjs` at session start as `AGENTS.md` asks, and the git hooks and CI are its gates. It is no longer selected by default and no longer causes `.claude/` to be generated.

## Options rejected
- Repair the adapter (matcher on native names, `tool_input.path`, JSON session-start output, documented bridge setup): works only after a manual, process-wide setup on an experimental bridge, for refusals the git hooks already make at commit time.

## Consequences
DeepSeek Harness users get refusals at commit time, like Copilot and Gemini CLI users.

## Revisit if
The bridge discovers a project's hook file by itself and leaves the experimental packages.
