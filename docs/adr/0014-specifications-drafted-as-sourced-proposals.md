# ADR-0014 — Specifications drafted as sourced proposals, framing left out

- **Status**: Accepted
- **Date**: 2026-11-23

## Context
Checkpoint A asks the human for product and technical specs, requirements and stack ADRs, and only
then can `plan-from-spec` help. In practice people ask the agent for specs from a brief or notes,
without a procedure: drafts fill gaps with plausible inventions, rules come out vague or compound,
stack choices are made silently, and the human has to find all of it. Research on LLM-written
requirements finds drafts whose quality tracks the input and that need human revision
(state of the art, section 12).

## Decision
A skill `draft-specs` with the contract of `plan-from-spec`: the agent writes a proposal under
`docs/plan/proposals/<date>/`, mirroring the repository paths, from the human's material only.
Every statement cites its source or is marked `(proposed)` and listed in `questions.md`; requirements
use EARS patterns with an acceptance case each; stack choices are Proposed ADRs; the draft goes
through a check-fix loop and, when the harness allows, a fresh-context reviewer. No new gate: the
existing ownership rules already keep the draft out of the real files.

## Options rejected
- Let the agent write the specs directly, adopted through review: the specs are the reference the
  gates and the reviewer hold the code to; the agent would be grading against rules it wrote.
- Ship the whole path from a vague idea (problem interview, research, shaping): that is product
  work with many valid methods, done before the repository exists or apart from it; the template
  would impose one and grow. The skill starts from whatever material the human brings.
- A script that checks the draft (ids ↔ cases, glossary terms): the check is cheap for the model
  and the human adopts every line anyway. Add it if adopted specs keep arriving with orphan ids.

## Consequences
Checkpoint A gets faster without moving ownership. The draft is only as good as the material: thin
material produces a short draft and many questions, which is the intended outcome.

## Revisit if
Drafts adopted without changes over several projects (the source and question rules may be
relaxed, see the assumptions register), or a gate starts reading the proposals folder.
