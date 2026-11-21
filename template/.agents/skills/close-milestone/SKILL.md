---
name: close-milestone
description: Prepare the evidence pack for a human checkpoint at the end of a milestone — run every gate, write docs/plan/checkpoints/<gate>.md with what was delivered, evidence, measurements, decisions and open risks, include a fresh-context review of the whole milestone, list what the human must decide, then stop. Use when the next plan line carries a humanGate or the last line of a milestone is done.
---

# Close a milestone

1. Run everything: `node scripts/harness/verify.mjs`, the slower suites the project defines
   (integration, end-to-end, build budgets, mutation testing when domain code changed).
2. Write `docs/plan/checkpoints/<gate>.md`:
   - what the milestone delivered (plan ids and one line each);
   - evidence: command outputs, screenshot paths, measurements against budgets;
   - decisions taken during the milestone (`git log --grep "Decision:" <start>..HEAD`);
   - open risks and follow-ups collected from `docs/plan/progress/*.md`.
3. Have a fresh-context reviewer run skill `review-change` on the whole milestone
   (`node scripts/harness/review-prompt.mjs --line <gate line> --range <start>..HEAD`), findings in
   categories 1–4 only; include its verdict unedited.
4. List what the human must do or decide: accounts, secrets, deploys, real-world trial, product
   choices, ADRs to write, plan lines to add or change.
5. Commit `docs: prepare checkpoint <gate>` with trailer `Plan: <gate line id>` and stop. Only the
   human marks the gate line done.
