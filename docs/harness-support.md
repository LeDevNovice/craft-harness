# Harness support

Checked against vendor documentation and changelogs in November 2026. Harnesses move fast: when
one changes, update the adapter and this page, and re-run `scripts/test-template.mjs`.

## The decision

The harness-independent core is what makes the template portable: `AGENTS.md` (AAIF standard),
`.agents/skills/` (Agent Skills standard), git hooks and CI. No adapter is required for correctness.

Adapters exist only where a harness offers something the core cannot: injecting `status.mjs` at
session start, refusing a forbidden edit or command *before* it happens (cheaper than a refused
commit), and a reviewer subagent. They are generated for the harnesses chosen at copy time.

- **First-class by default — Claude Code, Codex.** Claude Code has the richest hook surface and set
  the de-facto hook format; Codex is the origin of `AGENTS.md` and the most used alternative, with a
  compatible hook protocol.
- **Supported through the standards — DeepSeek Harness, Cursor, GitHub Copilot, Gemini CLI.** They
  read `AGENTS.md` (Gemini through one setting) and skills. Cursor imports `.claude/settings.json`
  hooks; its CLI's own hooks have open platform bugs, so no Cursor-specific file is generated.
  Copilot CLI also runs `.claude/settings.json` when it is generated (Claude Code or Cursor
  selected). DeepSeek Harness, Gemini CLI and the Copilot cloud agent get no pre-tool-use refusals
  from the template: their gates are the git hooks and CI (ADR-0011 for DeepSeek Harness).

Copilot (CLI and cloud agent, `.github/hooks/*.json`) and Gemini CLI (`.gemini/settings.json`, on
by default since v0.26.0) now ship project-level pre-tool-use hooks, which meets ADR-0003's revisit
condition. Whether the template generates adapters for them is open (#3).

## Matrix

| | Claude Code | Codex | DeepSeek Harness | Cursor | GitHub Copilot | Gemini CLI |
| --- | --- | --- | --- | --- | --- | --- |
| Instructions | `CLAUDE.md` (`@AGENTS.md`) | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` via `.gemini/settings.json` |
| Nested `AGENTS.md` | yes | yes (concatenated root → cwd) | yes | yes | yes | via settings |
| Skills | `.claude/skills` → `.agents/skills` | `.agents/skills` | `.agents/skills` | `.agents/skills` | `.agents/skills` | `.agents/skills` (native alias, which wins over the `.gemini/skills` link) |
| Session-start status | `SessionStart` hook | `SessionStart` hook | — | via import | CLI: `.claude/settings.json` when generated | — |
| Pre-tool-use refusals | `PreToolUse` (Edit, Write, Bash) | `PreToolUse` (Bash, apply_patch), after `/hooks` trust | — | `.claude/settings.json` import; Cursor `beforeShellExecution` payload also understood | CLI: `.claude/settings.json` when generated; cloud agent: — | — |
| Fresh-context reviewer | `reviewer` subagent | `review-prompt.mjs \| codex exec -` | subagent | subagent / headless | headless | headless |
| Parallel lanes | `lanes.mjs` (or native worktrees) | `lanes.mjs` | `lanes.mjs` | `lanes.mjs` | `lanes.mjs` | `lanes.mjs` |
| Authority | git hooks + CI | git hooks + CI | git hooks + CI | git hooks + CI | git hooks + CI | git hooks + CI |

## Notes per harness

**Claude Code.** `CLAUDE.md` imports `AGENTS.md` rather than relying on the AGENTS.md fallback:
the import works on every version and keeps a place for Claude-only notes; the fallback applies
only when no `CLAUDE.md` exists. Hooks use exit code 2 with the reason on stderr. Mods (Claude
Code's harness middleware) are not used: they customize the user's harness, not the repository's
rules.

**Codex.** Reads `AGENTS.md` from the git root down to the working directory (32 KiB default cap)
and skills from `.agents/skills`. Project hooks load only from trusted project layers and are tied
to their hash: run `/hooks` once to trust them, and again after a template update changes them.

**DeepSeek Harness.** Developer preview. Loads `AGENTS.md` from the project root down and skills
from `.agents/skills` (also `.dsh/skills`); the agent runs `status.mjs` itself at session start, as
`AGENTS.md` asks. No adapter is generated (ADR-0011): its Claude Code hooks bridge is experimental,
must be mounted by hand with a process-wide `configPath`, matches DeepSeek's own tool names (`bash`,
`str_replace_editor`) and injects only JSON `additionalContext` at session start, so the Claude Code
hook file did nothing there.

**Cursor.** Reads `AGENTS.md` and project skills; imports Claude Code hooks when "Include
Third-Party Plugins, Skills, and Other Configs" is on (the default). `agent-hook.mjs` also answers
Cursor's native `beforeShellExecution` JSON protocol if you wire it yourself.

**GitHub Copilot** (coding agent, CLI, code review) reads `AGENTS.md` and `.agents/skills`. Copilot
CLI also reads the repository's `.claude/settings.json`: it reports Claude tool names (`Edit`,
`Write`, `Bash`) to PascalCase hooks, its edit tools pass `path` (read by `agent-hook.mjs`), and it
fails closed when a hook errors, so the hook commands fall back to the git root when
`CLAUDE_PROJECT_DIR` is unset. The cloud agent loads only `.github/hooks/*.json`; the template ships
none, so its gates are CI plus CODEOWNERS.

**Gemini CLI** reads `AGENTS.md` through `context.fileName`, and skills from `.agents/skills`, an
alias that takes precedence over `.gemini/skills`. It has project hooks since v0.26.0, but the
template generates none for it yet: its gates are the git hooks and CI.

## Adding a harness

1. Point it at `AGENTS.md` and `.agents/skills` (symlink if it needs another path).
2. If it has pre-tool-use hooks, call `node scripts/harness/agent-hook.mjs` with the payload on
   stdin; extend the hook's payload parsing if the shape differs, and add a test to
   `scripts/harness/test/agent-hook.test.mjs`.
3. Add the choice to `copier.yml`, the adapter files with an `_exclude` condition, and a row here.
