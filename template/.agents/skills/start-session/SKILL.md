---
name: start-session
description: Get oriented before touching code — read the harness status, refuse to build on unexplained changes, restore green first, and state what the next plan line asks. Use as the first action of every session, after any context reset or compaction, and when unsure where the project stands.
---

# Start a session

1. Run `node scripts/harness/status.mjs` and read all of it: branch, uncommitted changes, last
   commits, next plan line, last progress notes, result of the green check.
2. **Uncommitted changes you did not make in this session**: do not build on them. Report them and
   stop — a previous session may have stopped mid-way on purpose.
3. **Repository not green**: the session's task is to make it green again with a `fix:` commit whose
   `Plan:` trailer names the line that broke it. Nothing else.
4. **Next line has a `humanGate`, is `blocked`, or none is ready**: stop and report.
5. **Git hooks not active** (`status.mjs` says so): stop and ask the human to run
   `node scripts/harness/install.mjs`. You never change the hooks path yourself.
6. Otherwise state in two or three sentences: what the line asks, which requirements and spec
   sections it cites, and what "verified" will mean for it. Then load skill `implement-line`.

Keep the context small: read only the spec sections and requirements the line cites, and only the
code it touches. Exploration that needs many files goes to a read-only subagent, which returns a
summary.
