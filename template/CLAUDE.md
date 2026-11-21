@AGENTS.md

## Claude Code specifics

- Skills live in `.agents/skills` (linked as `.claude/skills`); the `reviewer` subagent runs skill
  `review-change` in a fresh context: give it only `node scripts/harness/review-prompt.mjs` output.
- `.claude/settings.json` injects `status.mjs` at session start and refuses edits to human-owned
  files and gate-bypassing commands before they run. The git hooks still decide.
- Keep one plan line per session: `/clear` between lines.
