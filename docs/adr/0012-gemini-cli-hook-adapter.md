# ADR-0012 — Gemini CLI gets a hook adapter

- **Status**: Accepted (amends ADR-0003 and ADR-0002)
- **Date**: 2026-11-23

## Context
ADR-0003 left Gemini CLI without pre-tool-use refusals because it had no project hooks, and asked to revisit when a selectable harness shipped them (#3). Gemini CLI now runs project hooks from `.gemini/settings.json` by default (v0.26.0), blocks a call on exit code 2 with stderr as the reason, and passes tool arguments the agent hook already reads (`file_path`, `command`). It also reads skills from `.agents/skills`, a generic alias that wins over `.gemini/skills`.

## Decision
`.gemini/settings.json` adds a `BeforeTool` hook on `write_file`, `replace` and `run_shell_command` that runs `agent-hook.mjs`, which maps those tools to its path and command checks. No session-start hook: Gemini injects only JSON `additionalContext`, and `AGENTS.md` already makes the agent run `status.mjs`. The `.gemini/skills` link is removed.

## Options rejected
- Keep Gemini on git hooks and CI only: the gain is the same earlier refusals Claude Code and Codex get, for three tool names and one settings block.
- Add a session-start hook with a JSON mode for `status.mjs`: more code for context the agent already fetches itself.

## Consequences
Gemini CLI users accept the project hooks once (Gemini fingerprints them), and again after a template update changes them.

## Revisit if
Gemini renames its file or shell tools, or stops reading `.agents/skills`.
