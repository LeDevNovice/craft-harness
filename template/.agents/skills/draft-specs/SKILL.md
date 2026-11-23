---
name: draft-specs
description: Draft the specifications — product spec, technical spec, requirements as EARS rules with acceptance cases, stack ADRs, glossary — from the human's own material (brief, pitch, notes, research, interview), as a proposal the human reviews and adopts. Every statement is traced to its source, gaps become questions, nothing is invented. Use when the human brings an idea or a brief and asks for specs or requirements, or when docs/specs still holds the empty template. The plan comes after, with skill plan-from-spec.
---

# Draft the specifications

You propose; the human disposes. Specs, requirements and ADRs are human-owned: write the draft to
`docs/plan/proposals/<YYYY-MM-DD>/`, mirroring the repository paths (`docs/specs/product.md`,
`docs/specs/technical.md`, `docs/requirements.md`, `docs/adr/NNNN-*.md`, `CONTEXT.md`) so that
adopting it is a copy, plus `questions.md`. Never edit the real files.

A draft is only as good as its material, and gaps tend to get filled with plausible inventions that
the human then has to find. So every rule, case and decision cites its source — `(source: <file>
§<section>)` or `(source: conversation <date>)` — and anything else is marked `(proposed)` and listed
in `questions.md`. Keep the draft small: the human reviews every line of it.

1. **Gather** the material the human points to, and the current `docs/specs/`, `docs/requirements.md`,
   `docs/adr/` and `CONTEXT.md`. If the material does not say who has which problem and at least one
   journey, stop and report what is missing. If specs already exist, propose changes only: keep every
   id, number new ones after the highest, never reuse one.
2. **Ask** before drafting: list what the material leaves open, ranked by the rework a wrong guess
   would cause. If the human is in the session, ask the top ones one at a time (five at most) and cite
   the answers as sources; the rest go to `questions.md`, each with what it blocks.
3. **Product** (`product.md`, the template's sections): behaviour only, no stack or file names.
   Journeys from the user's side, error and empty states included. Out of scope = the material's
   no-gos.
4. **Requirements**: one rule per id (pattern `requirements.idPattern` of `harness.config.json`), each
   in one EARS pattern — `The <system> shall …`, `When <trigger>, the <system> shall …`, `While
   <state>, …`, `If <unwanted event>, then …`, `Where <feature>, …` — in the glossary's words,
   observable, one behaviour (no "and"), no unmeasured "fast" or "easy". Each id gets at least one
   acceptance case in `product.md` (given / when / then, concrete values) that cites it.
5. **Technical** (`technical.md`): quality attributes and hard constraints only from what the
   material says; the ranking is the human's call, so it is `(proposed)`. One ADR per stack choice
   (the template's format, status Proposed): at least two options including the simplest, judged
   against the ranking, versions checked in current documentation. Section 7 takes the no-gos, each
   with the condition that would bring it back.
6. **Glossary** (`CONTEXT.md`): each domain term once, its product name and its code name; merge
   synonyms.
7. **Check, fix, repeat** until clean: every id has a case and every case cites an existing id; no
   term outside the glossary; no contradiction between files; out of scope matches deliberately
   absent; nothing unsourced and unmarked. Then, if your harness can run a subagent or a headless
   session, give a reviewer that did not write the draft the draft and the material only; it reports
   unsourced statements, contradictions and untestable rules, each with its line and why.
8. Commit `docs: propose specifications <date>` with the trailer of the line in progress (or report
   without committing if none) and stop. Report the open questions first. The human adopts the draft
   with `HARNESS_HUMAN=1`; skill `plan-from-spec` then drafts the plan.
