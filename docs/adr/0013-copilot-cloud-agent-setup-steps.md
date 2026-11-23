# ADR-0013 — Copilot cloud agent: activate the git hooks through setup steps

- **Status**: Accepted (amends ADR-0003)
- **Date**: 2026-11-23

## Context
The Copilot cloud agent works unattended in a fresh clone. There the git hooks are active only if something runs `install.mjs` (the TypeScript profile's `prepare` script, never the `none` profile), and CI does not replay the per-commit rules (#10). GitHub runs `.github/workflows/copilot-setup-steps.yml` (a single `copilot-setup-steps` job, from the default branch) before the agent starts. The cloud agent also loads pre-tool-use hooks from `.github/hooks/*.json` (#3).

## Decision
When Copilot is selected, the template generates `copilot-setup-steps.yml`: checkout, Node, dependencies (TypeScript profile), `install.mjs`, then `status.mjs --no-check`. The cloud agent then commits through the same pre-commit, commit-msg and pre-push gates as a local session. No `.github/hooks/` file for now.

## Options rejected
- A `.github/hooks/*.json` pre-tool-use hook only: earlier refusals, but the gates that decide would still be inactive in the sandbox.
- Both at once: Copilot CLI would also run that hook next to `.claude/settings.json`, and the hook adds little once the git hooks run. Add it if the cloud agent keeps hitting the gates at commit time.

## Consequences
The workflow only takes effect once it is on the default branch; validate it from the Actions tab. If a setup step fails, Copilot starts anyway with the environment as it is, so a red setup run must be fixed, not ignored.

## Revisit if
The cloud agent activates repository git hooks by itself, or GitHub changes the setup-steps contract.
