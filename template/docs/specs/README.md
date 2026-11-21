# Specifications (human-owned)

| File | Holds | Authority |
| --- | --- | --- |
| `product.md` | Problem, users, journeys, rules, acceptance cases | Behaviour |
| `design.md` | Identity, components, copy, screen-by-screen states (delete if there is no UI) | Look and wording |
| `technical.md` | Architecture, stack, data, interfaces, **ranked quality attributes**, budgets | Implementation |

Numbered, testable rules live in `../requirements.md`; decisions in `../adr/`. The agent reads these
files and never edits them: a change goes through the human, then into the plan.
