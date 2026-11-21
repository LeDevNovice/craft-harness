# Lineage — from the Deux Places agent kit to a template

[Deux Places](https://github.com/LeDevNovice/deux-places) is a PWA built commit by commit by coding
agents with a hand-made agent kit (`docs/agent-kit.md` there). Its behaviour in practice — small,
reviewed, traceable commits, agents that stop instead of improvising — is what this template keeps.
This page records what was kept, what was generalized, what changed and what was left out.

## Kept as is (the load-bearing ideas)

- Instructions guide, deterministic gates decide; gates work in every harness because they are git hooks.
- One plan line per session in a fresh context; a JSON plan where the agent changes `status` and `notes` only.
- The planned commit message verbatim, a `Plan:` trailer, one line per commit, `<id>a` preparatory refactors.
- Canon TDD loop, test list from the exact requirement text, expectations never copied from the code.
- Skill `decide`: two options, ranked quality attributes, evidence, pre-mortem, YAGNI, `Decision:` lines.
- Fresh-context adversarial review limited to defects that matter, with an explicit verdict.
- Human-owned specs, requirements, ADRs, instructions and harness; human checkpoints with evidence packs.
- Stop conditions; "APIs from reality, not memory"; precedence table between sources of truth.
- Requirement ids in test titles, checked by script; the guard against deleted, skipped or weakened tests.
- `CONTEXT.md` glossary; MADR ADRs with "Revisit if"; proportionality ("absent, and when to add it").
- dependency-cruiser with the SWC parser (TypeScript 7's compiler API is not usable by it).

## Generalized

| Deux Places | Template | Why |
| --- | --- | --- |
| `RG-xx` business rules in `docs/rules.md` | `{prefix}-NN` in `docs/requirements.md`, id regex in config | Any project, any naming |
| `J0.1` line ids, `commits` key | `{prefix}0.1`, `lines` key, regex in config | Same |
| Hard-coded owned paths, test patterns, thresholds in each script | `harness.config.json`, one place, human-owned | Language-agnostic core; profiles only change data |
| Test titles `describe/it/test` | `titlePattern` (TS) or id anywhere in a test file (other languages) | Python/Go/JVM test names cannot hold an id |
| `DP_HUMAN`, `DP_PLAN_EDIT`… | `HARNESS_HUMAN`, `HARNESS_PLAN_EDIT`… | Project-neutral |
| `effect-v4`, `durable-objects`, `ui-screen` skills | Not shipped; `src/AGENTS.md` and `docs/customizing.md` explain how to write stack skills | Stack-specific |
| `.claude/hooks/protect.mjs` (Claude payloads) | `scripts/harness/agent-hook.mjs` (Claude Code, Codex `apply_patch`, Cursor shell) | One hook for every adapter |

## Changed, with the reason

| Change | Reason |
| --- | --- |
| Plan lines may declare `dependsOn` and `touches`; plan-check validates dependencies instead of a strict prefix order | Enables parallel lanes; a plan without them behaves exactly like Deux Places (implicit chain) |
| One progress note per line (`docs/plan/progress/<id>.md`) instead of one growing `PROGRESS.md` | Deux Places' log reached ~240 KB: costly to load, and parallel lanes would conflict on it |
| `review-prompt.mjs` builds the reviewer's input | Fresh-context review in any harness, headless or subagent, with exactly the diff, line and requirement text |
| Skills follow the Agent Skills spec strictly (`whenToUse` folded into `description`) | `whenToUse` is not a standard field; `description` is what every harness indexes |
| `.agents/skills` as the source, `.claude/skills` as a link | Read natively by Codex, DeepSeek Harness, Cursor, Copilot |
| Shell writes to owned files refused by target, not by mention | Reading a spec or redirecting a log must stay possible |
| `git branch -D`, `git clean -f`, `--force-with-lease` also refused | Lanes and worktrees make them more tempting and more destructive |
| Guard and requirements check ignore owned files' content | The harness's own tests contain skip fixtures and requirement ids |
| Requirements check also verifies each cited id exists in the requirements file | Catches typos in plan lines |
| Harness self-tests shipped and run by `verify --ci` | A project can change its config or update the template and still prove its gates work |
| `docs/harness/assumptions.md` + skill `audit-harness` | Components expire as models improve; remove them on evidence |
| `plan-from-spec` skill writing proposals | The plan is human-owned; the agent drafts, the human adopts |
| CODEOWNERS on owned paths | Local human variables are an honour system; the server makes the rule hold |
| Copier instead of copying a kit into an empty repo | Projects receive later improvements with `copier update` |

## Left out

- Project-specific CI steps (size budget, backups, deploy gate, smoke tests): they belong to the
  project's plan, not to the harness.
- A Stop hook that re-runs the gate before the agent may stop: stop conditions require the agent to
  stop on a red or ambiguous state, which such a hook would fight.
- Turborepo, Lefthook, commitlint: Deux Places already removed them (its ADR-023) for the same
  control with less configuration.
