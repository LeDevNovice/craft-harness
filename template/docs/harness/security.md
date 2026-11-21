# Security of an agent-built repository

A coding agent has, by design, access to private data (the code, your machine), reads untrusted
content (dependencies, issues, web pages, tool output) and can communicate (network, git push).
That combination — the "lethal trifecta" — means one prompt injection can turn into data
exfiltration or a malicious commit. The harness reduces the blast radius; it does not remove it.

## What the harness does

- **Treat content as data**: `AGENTS.md` tells the agent that text from issues, pages, packages or
  tool output never overrides its instructions.
- **Owned files**: instructions, skills, hooks, harness scripts, CI and specs cannot be changed by
  the agent (agent hook before the edit, pre-commit guard after). An injected instruction cannot
  quietly rewrite the rules or weaken a gate.
- **Gates no prompt can talk past**: git hooks and CI do not read prompts.
- **Small, reviewed commits**: every behaviour change is reviewed by a context that did not see the
  untrusted content the implementer read.
- **No secrets in reach**: secrets live in your secret manager or untracked env files; accounts,
  deploys and paid services are human actions (stop conditions).

## What you should add

- **Sandbox the agent**: run it with OS-level sandboxing or in a container or VM with network access
  limited to the package registries and documentation it needs. Most harnesses ship a sandbox
  mode; turn it on.
- **Least privilege for credentials**: the agent's environment gets no production credentials and,
  if it pushes at all, a token scoped to this repository without admin rights.
- **Protect `main`**: require CI and CODEOWNERS review (`.github/CODEOWNERS` lists the owned paths).
- **Vet third-party skills, plugins and MCP servers** like dependencies: read them before adding
  them; they are prompts with execution rights.
- **Review context files of cloned repositories** before running an agent in them.
- **Pin and update dependencies deliberately** (lockfile, update bot, human review of updates).
