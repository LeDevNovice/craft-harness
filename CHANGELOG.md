# Changelog

Versions are git tags; `copier update` moves a project between them.

## Unreleased

- Fix: `plan-check` refuses a line newly marked `provided` without `HARNESS_PLAN_EDIT=1`. An agent
  could otherwise skip a line, its requirement test and a human checkpoint (#4).

## v0.1.0 — 2026-11-21

First release, extracted from the Deux Places agent kit and generalized (see `docs/lineage.md`).

- Language-agnostic harness core: status, verify, plan-check, requirements-check, guard, commit-msg,
  agent-hook, lanes, review-prompt, install; configured by `harness.config.json`; 33 self-tests.
- Nine Agent Skills, `AGENTS.md` ≈ 100 lines, specs/requirements/ADR/plan skeletons, harness guide,
  assumptions register, security notes.
- Adapters: Claude Code, Codex, DeepSeek Harness, Cursor, GitHub Copilot, Gemini CLI.
- Optional parallel lanes (`dependsOn`, `touches`, worktrees, serial verified integration).
- TypeScript profile: pnpm, TypeScript 7, Vitest 5, oxlint, Prettier, dependency-cruiser (SWC parser).
