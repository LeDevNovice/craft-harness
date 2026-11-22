# Architecture of the template

## Repository layout

```
copier.yml        questions, conditional files, post-copy message
template/         the generated project (Copier _subdirectory); files ending in .jinja are rendered
docs/             this documentation and the template's own ADRs
scripts/          test-template.mjs: generates every variant and runs its gates (used by CI)
```

## Layers of a generated project

| Layer | Nature | Files | Changed by |
| --- | --- | --- | --- |
| Instructions | advisory, always loaded | `AGENTS.md`, nested `AGENTS.md`, `CLAUDE.md` | human |
| Procedures | advisory, loaded on demand | `.agents/skills/*/SKILL.md` | human |
| Sources of truth | read when a line cites them | `docs/specs/`, `docs/requirements.md`, `docs/adr/`, `CONTEXT.md` | human (`CONTEXT.md`: agent may add terms) |
| State | read at every session start | `docs/plan/plan.json`, `docs/plan/progress/`, git history | agent (status, notes, progress) and human (structure) |
| Gates | deterministic, authoritative | `.githooks/`, `scripts/harness/`, CI | human |
| Adapters | deterministic, best effort, earlier | `.claude/settings.json`, `.codex/hooks.json`, `.gemini/settings.json` | human |
| Configuration | data for the gates | `harness.config.json` | human |

"Human-owned" is enforced three times: the agent hook refuses the edit, the pre-commit guard
refuses the commit, and CODEOWNERS with branch protection refuses the merge.

## Flows

### A session (sequential mode)

1. The adapter injects `status.mjs --no-check`; the agent runs `status.mjs` (skill `start-session`).
2. Unexplained changes → stop. Red → fix only. Gate, blocked line, unactivated hooks → stop.
3. `implement-line`: status `in_progress` → test list → red/green/refactor → `decide` for open
   choices → `verify.mjs` + the line's verification → `review-change` in a fresh context →
   status `done`, `progress/<id>.md` → one commit with the planned message and `Plan: <id>`.
4. Hooks re-check everything at commit; the session ends.

### Parallel lanes

1. The human gives independent lines `dependsOn` and `touches` (path globs).
2. `lanes.mjs ready` selects, in plan order, ready lines without a gate whose touches are disjoint
   from each other and from running lanes. A line without `touches` runs alone.
3. `lanes.mjs start <id>` creates a worktree outside the repository on branch `lane/<id>`. One
   agent per lane, fresh context, same loop as above (hooks run inside the worktree too).
4. `lanes.mjs finish <id>` merges `--no-ff --no-commit`, runs `verify.mjs` on the merged tree,
   commits, removes the worktree. Conflict or red → `git merge --abort` and a report; the lane
   agent merges the base branch into its lane and tries again.

### Checkpoints

A line with `humanGate` stops the agent. Skill `close-milestone` prepares the evidence pack and a
milestone-wide fresh review; only `HARNESS_HUMAN_GATE=<gate>` can mark the line done.

## The gates

| Script | Runs in | Refuses |
| --- | --- | --- |
| `guard.mjs` | pre-commit, `verify` | staged edits to owned paths; deleted, focused or skipped tests; tests that stop naming a requirement; removed threshold lines (owned files are left to the ownership rule) |
| `plan-check.mjs` | pre-commit (`--staged`), `verify`, CI | duplicate or malformed ids; unknown statuses; missing fields; `dependsOn` forward or unknown; work started before its dependencies are done; overlapping lines in progress; structural edits, checkpoint closings and lines marked `provided` without the human variables |
| `requirements-check.mjs` | pre-commit, `verify`, CI | a requirement cited by a finished line that is undefined or named by no test (owned files never count as coverage) |
| `commit-msg.mjs` | commit-msg | non-Conventional headers; missing `Plan:` trailer; a completing commit whose header differs from the plan; two lines completed at once; `feat`/`chore` commits that reference a line without completing it; `<id>a` trailers on anything but a non-completing `refactor:` |
| `agent-hook.mjs` | adapters (pre-tool-use) | edits and shell writes to owned paths; `--no-verify`, force push, history rewrites, `branch -D`, `clean -f`, hooks-path changes, `HARNESS_*` variables, project-specific forbidden commands |
| `verify.mjs` | before every commit (agent), pre-push and CI (`--ci`) | the plan (without the comparison with HEAD), the requirements, the staged guard and the project check; with `--ci`, the harness self-tests instead of the guard |

Human variables: `HARNESS_HUMAN=1` (owned files, trailer-less commits), `HARNESS_PLAN_EDIT=1`
(plan structure), `HARNESS_HUMAN_GATE=<gate>` (close a checkpoint), `HARNESS_ALLOW_TEST_CHANGE=1`
(test or threshold change). They are an honour system locally, and `git commit --no-verify` skips
every local hook: the agent hook refuses it, as best a pattern match can. CI re-runs the plan and
requirements checks, the project check and the self-tests, but not the per-commit rules (guard,
`commit-msg`, plan changes against HEAD). On a shared repository, CODEOWNERS makes owned files and
`plan.json` need the owner's review; require a review on every pull request for the rest.

## `harness.config.json` reference

| Key | Meaning |
| --- | --- |
| `plan`, `progressDir` | Plan file and progress notes folder |
| `planIdPattern` | Regex of line ids (`M\d+\.\d+`); a lowercase letter suffix marks preparatory refactors |
| `commitTypes` | Allowed Conventional Commit types |
| `requirements.file`, `.idPattern` | Requirements file and id regex (`REQ-\d{2,}`) |
| `tests.dirs` | Folders scanned for tests by the requirements check |
| `tests.filePattern` | Regex recognizing test files (guard and requirements check) |
| `tests.titlePattern` | Regex whose group 2 is a test title; `null` = id anywhere in a test file |
| `tests.skipPatterns` | Regexes of focused or skipped tests refused when added |
| `ownedPaths` | Globs of human-owned paths (`**`, `*`, `?`) |
| `thresholds.files`, `.keywords` | Files where removing a line containing a keyword counts as weakening a threshold |
| `commands.check`, `.precommit` | Project check run by `verify`/`status`, fast check run by pre-commit |
| `forbiddenCommands` | Extra `{ pattern, reason }` refused by the agent hook (deploys, secrets…) |
| `lanes.root`, `.branchPrefix` | Where lane worktrees go (`{repo}` = repository name; must be outside it) and their branch prefix |
