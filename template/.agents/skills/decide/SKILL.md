---
name: decide
description: Make a technical choice explicitly and without bias — at least two options including the simplest, judged against the project's ranked quality attributes and hard constraints, checked against real evidence, pre-mortem, YAGNI, recorded as a Decision line. Use whenever the plan line, specs and ADRs leave a choice open (data shape, API shape, library function, test strategy, naming, error handling).
---

# Decide

Self-review without external evidence does not reliably improve reasoning; tests, types,
documentation and measurements do. So a decision is made on evidence, written down, and small.

1. **State the question** in one sentence, and why the sources do not already answer it. If an ADR
   or a spec answers it, follow it and stop here.
2. **Generate at least two options** before judging any. The first idea is not privileged. The
   simplest option ("do nothing", "inline it", "use what exists") is always one of them.
3. **Judge against the ranked quality attributes and hard constraints** of
   `docs/specs/technical.md` (section "Quality attributes"). A higher-ranked attribute wins over any
   number of lower ones; a hard constraint is never traded.
4. **Check the evidence**: read the installed types or the cited documentation of every API
   involved; if a quick experiment (a test) can settle it, run it.
5. **Pre-mortem**: "Six months later this choice was wrong — what most likely happened?" If that is
   plausible and cheap to prevent, adjust.
6. **YAGNI**: does every part of the chosen option serve the current line? Remove the rest.
7. **Record** in the commit body, one line per decision:
   `Decision: <choice> — over <rejected option(s)> because <attribute or evidence>.`
8. **Escalate** (stop and report) when the choice adds a dependency, a layer or a pattern used
   across modules, changes a published interface, or contradicts an ADR: that needs a human ADR.
