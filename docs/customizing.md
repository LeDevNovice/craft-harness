# Customizing a generated project

Everything below is a human change (`HARNESS_HUMAN=1`), reviewed like code.

## Gates

All rules live in `harness.config.json` (reference: [architecture](architecture.md#harnessconfigjson-reference)).

- **Another language.** Set `tests.filePattern`, `tests.skipPatterns` and, when test titles can
  hold the id, `tests.titlePattern`. Point `commands.check` at the project's full check and
  `commands.precommit` at its fast one. Add the language's strictness files to `thresholds.files`.
- **Project-specific forbidden commands.** Add `{ "pattern": "wrangler\\s+(deploy|secret)", "reason":
  "deploys and secrets are human actions" }` to `forbiddenCommands`.
- **More owned paths.** Published contracts, migrations already applied, design tokens: add globs to
  `ownedPaths` and the same lines to `.github/CODEOWNERS`.

Then run `node --test "scripts/harness/test/*.test.mjs"` — the self-tests use their own fixture
configuration, so they keep proving the scripts; add a test when you change a script's behaviour.

## Skills

A stack or domain skill (an ORM's idioms, a framework's version traps, a UI checklist) goes in
`.agents/skills/<name>/SKILL.md`:

```markdown
---
name: effect-v4
description: How this repository uses Effect 4 (services, layers, errors, tests) and how to avoid v3-era APIs. Use before writing or changing code that imports effect.
---
# Effect 4 in this repository
Ground truth, in order: installed types under node_modules/effect, then the official v4 docs …
```

Rules of thumb from the Agent Skills specification and from practice: `name` equals the folder
name; `description` says what *and when*; the body stays under ~500 lines and moves reference
material to `references/`; write only what the model would get wrong without it; name the version
and the source of truth for any API.

## Nested `AGENTS.md`

Put area rules next to the code they govern (`src/server/AGENTS.md`, `e2e/AGENTS.md`): layer
rules, test levels, proof expected for that area. The nearest file wins. Keep each one short.

## Profiles

A profile is data plus a few files: the config values above, the tool configs, a `check` command,
one smoke test so the project is green at commit 0, and a nested `AGENTS.md`. To add one to the
template: add a choice to `profile` in `copier.yml`, its files under `template/` with `_exclude`
conditions, its branch in `harness.config.json.jinja`, and a variant to `scripts/test-template.mjs`.

## Plan ids and requirement prefixes

Chosen at copy time (`plan_prefix`, `requirement_prefix`). To change them later, edit
`planIdPattern` and `requirements.idPattern` and rename ids in the plan and requirements in one
human commit (`HARNESS_PLAN_EDIT=1 HARNESS_ALLOW_TEST_CHANGE=1` if test titles change).
