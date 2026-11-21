# craft-harness

A repository template for building software with coding agents — one agent or several — without
giving up software craftsmanship.

Agents implement a human-owned plan **one line per session**, test-first, in a fresh context. Short
instructions tell them what to do; deterministic gates (git hooks, zero-dependency scripts, CI)
refuse what must never happen, whatever the harness, the model or the prompt. A reviewer that did
not write the change checks every behaviour change. Independent lines can run in parallel lanes,
integrated one at a time. Every harness component is written down as an assumption, so you can
remove it when a better model no longer needs it.

```bash
uvx copier copy gh:LeDevNovice/craft-harness my-project
```

## Why

Coding agents are now good enough to build real software for hours — and still good enough at
looking done to fool you. Three failure modes dominate in practice and in the research
([state of the art](docs/state-of-the-art.md)):

1. **Drift.** Long sessions lose instructions, skip ahead, merge steps, declare victory early.
2. **Gaming the checks.** Under pressure to pass, agents delete, skip or bend tests, or edit the
   spec instead of the code.
3. **Self-approval.** A model reviewing its own work in its own context approves its own mistakes.

The template answers each with structure rather than with longer prompts: a plan the agent cannot
reorder, gates it cannot talk past, a reviewer that never saw its reasoning.

## What you get

```
AGENTS.md                  ≈100-line map: session start, sources of truth, loop, boundaries, stop conditions
CLAUDE.md                  @AGENTS.md + Claude Code notes                         (adapter)
CONTEXT.md                 domain language: one term, one name in code
harness.config.json        every rule the gates apply (owned paths, id patterns, tests, thresholds, commands)
.agents/skills/            9 Agent Skills: start-session · implement-line · decide · review-change ·
                           test-requirements · close-milestone · run-lanes · plan-from-spec · audit-harness
.claude/  .codex/  .gemini/  harness adapters: session-start status, pre-tool-use refusals, reviewer subagent
.githooks/                 pre-commit · commit-msg · pre-push → scripts/harness
scripts/harness/           status · verify · plan-check · requirements-check · guard · commit-msg ·
                           agent-hook · lanes · review-prompt · install  (Node ≥ 22, no dependencies, 33 self-tests)
docs/specs/                product · technical (ranked quality attributes) · design      (human-owned)
docs/requirements.md       numbered, testable rules, each traced to a test               (human-owned)
docs/adr/                  short MADR decisions                                           (human-owned)
docs/plan/plan.json        milestones → lines; the agent edits status and notes only
docs/plan/progress/        one evidence note per line
docs/harness/              human guide · assumptions register · security
.github/                   CI running the same gate · CODEOWNERS on owned paths · PR template
```

Plus, with the **TypeScript profile**: pnpm, strict TypeScript 7, Vitest, oxlint, Prettier,
dependency-cruiser boundaries, `pnpm check`, green from commit 0. With profile **none** you get the
harness alone; it is language-agnostic (test detection and skip patterns for JS/TS, Python, Go,
JVM and .NET are preconfigured).

## How it works

```
 human ──► specs, requirements, ADRs ──► plan.json (milestones → lines, checkpoints)
                                              │
 session ─► start-session: status.mjs ─► next line ─► implement-line
             test list → red → green → refactor → verify.mjs → review-change (fresh context)
             → plan status done + progress note → one commit "<planned message>  Plan: M1.2"
                                              │
 gates ───► pre-commit: guard · plan-check · requirements-check · project precommit
            commit-msg: planned message, one line per commit, Plan trailer
            pre-push / CI: verify --ci (self-tests, plan, requirements, project check)
                                              │
 human ───► reviews each commit; decides at checkpoints (close-milestone evidence pack)
```

Parallel mode: lines with `dependsOn` and disjoint `touches` run in separate git worktrees, one
writer each (`lanes.mjs start`), and are merged one at a time with every gate re-run on the merged
tree (`lanes.mjs finish`). Most software work is sequential; the default plan is too.

## Harnesses

`AGENTS.md`, `.agents/skills/` and the git hooks work everywhere. Adapters add earlier refusals and
session-start context:

| Harness | Instructions and skills | Pre-tool-use refusals |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` → `AGENTS.md`, `.claude/skills` → `.agents/skills`, reviewer subagent | `.claude/settings.json` |
| Codex | native | `.codex/hooks.json` |
| DeepSeek Harness | native | `.claude/settings.json` via its Claude Code hooks bridge |
| Cursor | native | `.claude/settings.json` via third-party import |
| GitHub Copilot | native | git hooks and CI only |
| Gemini CLI | `.gemini/settings.json` → `AGENTS.md` | git hooks and CI only |

Why these, and what each one guarantees: [docs/harness-support.md](docs/harness-support.md).

## Quick start

```bash
uvx copier copy gh:LeDevNovice/craft-harness my-project   # answer: name, owner, profile, harnesses, id prefixes
cd my-project
node scripts/harness/install.mjs                            # activates the git hooks
pnpm install                                                # TypeScript profile only
node scripts/harness/verify.mjs                             # green
git add -A && HARNESS_HUMAN=1 git commit -m "chore: add the agent harness"
```

Then write `docs/specs/` and `docs/requirements.md` (the agent can draft a plan for you with skill
`plan-from-spec`), adopt the plan, and start sessions with:

> Apply skill `start-session`, then `implement-line` for the next plan line. One line only.
> Stop and report if a stop condition of AGENTS.md occurs.

The generated `docs/harness/README.md` is the full guide. Later, `uvx copier update` brings
template improvements into your project with a three-way merge.

## Documentation

- [State of the art](docs/state-of-the-art.md) — the research behind every choice, with sources
- [Architecture](docs/architecture.md) — layers, flows, configuration reference
- [Harness support](docs/harness-support.md) — what each harness reads and enforces
- [Customizing](docs/customizing.md) — profiles, skills, gates, ids
- [Lineage](docs/lineage.md) — what was kept, generalized and changed from the Deux Places kit
- [Decisions](docs/adr/) — the template's own ADRs

## Origin

Extracted from the agent kit of [Deux Places](https://github.com/LeDevNovice/deux-places), a PWA
built commit by commit by coding agents, then generalized and re-checked against the research of
late 2026.

## License

MIT — see [LICENSE](LICENSE).
