# Changelog

Versions are git tags; `copier update` moves a project between them.

## Unreleased

- Fix: `plan-check` refuses a line newly marked `provided` without `HARNESS_PLAN_EDIT=1`. An agent
  could otherwise skip a line, its requirement test and a human checkpoint (#4).
- Fix: the pre-commit guard tracks paths with non-ASCII characters or spaces. Git quoted them, so
  edits to such owned files and skipped tests in such test files went unnoticed (#6).
- Fix: the agent hook refuses abbreviated `--no-verify` (`--no-ver`) and clustered short flags
  (`git commit -nm`). The docs now say what CI re-checks and what it does not (#5).
- Fix (TypeScript profile): `tsconfig.json`, `vitest.config.*`, `.oxlintrc.json` and
  `.dependency-cruiser.cjs` are human-owned, and `commands.check`/`precommit` hold the literal
  commands instead of `pnpm -s check`. An agent could otherwise relax strictness, exclude a test or
  empty the `check` script, and every gate stayed green (#1).
- Change: DeepSeek Harness is supported through the standards (`AGENTS.md`, `.agents/skills`, git
  hooks, CI) instead of a hooks adapter, and is no longer selected by default. Its bridge never
  matched the generated `.claude/settings.json` (#2, ADR-0011).
- Fix: `.claude/settings.json` hook commands fall back to the git root when `CLAUDE_PROJECT_DIR` is
  unset, and `agent-hook.mjs` reads the `path` argument. Copilot CLI runs that file: its edits went
  unchecked, and a missing `CLAUDE_PROJECT_DIR` made the hook fail, which Copilot turns into a
  refusal of every tool call. The harness docs now say that Copilot and Gemini CLI ship hooks (#3).
- Feature: Gemini CLI gets a `BeforeTool` hook in `.gemini/settings.json` that runs `agent-hook.mjs`
  on `write_file`, `replace` and `run_shell_command`; the redundant `.gemini/skills` link is gone, as
  Gemini reads `.agents/skills` (#3, ADR-0012).

## v0.1.0 — 2026-11-21

First release, extracted from the Deux Places agent kit and generalized (see `docs/lineage.md`).

- Language-agnostic harness core: status, verify, plan-check, requirements-check, guard, commit-msg,
  agent-hook, lanes, review-prompt, install; configured by `harness.config.json`; 33 self-tests.
- Nine Agent Skills, `AGENTS.md` ≈ 100 lines, specs/requirements/ADR/plan skeletons, harness guide,
  assumptions register, security notes.
- Adapters: Claude Code, Codex, DeepSeek Harness, Cursor, GitHub Copilot, Gemini CLI.
- Optional parallel lanes (`dependsOn`, `touches`, worktrees, serial verified integration).
- TypeScript profile: pnpm, TypeScript 7, Vitest 5, oxlint, Prettier, dependency-cruiser (SWC parser).
