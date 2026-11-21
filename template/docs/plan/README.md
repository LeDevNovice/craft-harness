# The plan

`plan.json` is the work list: milestones of lines, one line = one session = one commit. JSON rather
than Markdown on purpose: agents are much less tempted to rewrite a structured list, and scripts can
check it. The agent changes only `status` and `notes`; any other change is a human edit
(`HARNESS_PLAN_EDIT=1 HARNESS_HUMAN=1 git commit …`).

## A line

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | `<milestone>.<n>`, matching `planIdPattern` in `harness.config.json` |
| `message` | yes | The exact Conventional Commit header of the commit that completes the line |
| `content` | yes | What changes, citing requirement ids and spec sections |
| `verification` | yes | A command or an observable check that proves the line, never "it works" |
| `status` | yes | `todo` → `in_progress` → `done`, or `blocked` (with `notes`); `provided` = delivered by the human |
| `notes` | no | Why a line is blocked, or a remark for the next session |
| `humanGate` | no | Checkpoint letter: only the human marks this line done (`HARNESS_HUMAN_GATE=<letter>`) |
| `dependsOn` | no | Line ids that must be done first. Without it, a line depends on the previous one |
| `touches` | no | Path globs the line may change. Needed, with `dependsOn`, for parallel lanes |
| `requirements` | no | Requirement ids, when the text does not cite them |

A plan without `dependsOn` is strictly sequential, which is the right default: parallel lanes pay
only for lines that are truly independent (skill `run-lanes`).

## Next to the plan

- `progress/<id>.md` — one note per finished or blocked line: what, evidence, review, decisions,
  follow-ups. One file per line keeps parallel lanes free of merge conflicts.
- `checkpoints/<gate>.md` — evidence pack for a human checkpoint (skill `close-milestone`).
- `proposals/<date>/` — plans and requirements drafted by the agent, adopted or not by the human.
- `audits/<date>.md` — harness audits (skill `audit-harness`).
