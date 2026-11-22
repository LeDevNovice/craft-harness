// Guards the plan (harness.config.json → plan).
//   node scripts/harness/plan-check.mjs            → validate the working-tree plan (verify, CI)
//   node scripts/harness/plan-check.mjs --staged   → also compare the staged plan with HEAD (pre-commit)
// Rules:
//   1. Structure: unique ids matching planIdPattern, known statuses, non-empty message/content/verification.
//   2. Dependencies: `dependsOn` names earlier lines only (no cycles). A line without `dependsOn` depends on
//      the previous line, so a plain plan is strictly sequential.
//   3. Order: a line may be in_progress, done or blocked only when all its dependencies are done.
//   4. Parallel work: several lines in progress at once need explicit, pairwise disjoint `touches`.
//   5. Against HEAD, only `status` and `notes` may change (structural edits: HARNESS_PLAN_EDIT=1, human only).
//   6. A line carrying `humanGate` becomes done only with HARNESS_HUMAN_GATE=<gate> (human only).
//   7. A line becomes `provided` (delivered outside the loop) only with HARNESS_PLAN_EDIT=1 (human only).
import {
  DONE,
  STARTED,
  STATUSES,
  config,
  dependencies,
  fail,
  human,
  lines,
  readPlanAt,
  readPlanStaged,
  readPlanWorkingTree,
  touchesOverlap,
} from "./lib.mjs";

const staged = process.argv.includes("--staged");
const plan = staged ? readPlanStaged() : readPlanWorkingTree();
const problems = [];
const all = lines(plan);
const idPattern = new RegExp(`^${config().planIdPattern}$`);
const position = new Map();

all.forEach((line, index) => {
  if (position.has(line.id)) problems.push(`duplicate id ${line.id}`);
  position.set(line.id, index);
  if (!idPattern.test(line.id))
    problems.push(`${line.id}: id does not match planIdPattern /${config().planIdPattern}/`);
  if (!STATUSES.includes(line.status)) problems.push(`${line.id}: unknown status "${line.status}"`);
  for (const field of ["message", "content", "verification"]) {
    if (typeof line[field] !== "string" || line[field].trim() === "")
      problems.push(`${line.id}: missing "${field}"`);
  }
});

const status = new Map(all.map((l) => [l.id, l.status]));
const deps = dependencies(all);
for (const line of all) {
  for (const dep of line.dependsOn ?? []) {
    if (!position.has(dep)) problems.push(`${line.id}: dependsOn unknown line ${dep}`);
    else if (position.get(dep) >= position.get(line.id))
      problems.push(`${line.id}: dependsOn ${dep}, which is not earlier in the plan`);
  }
  if (STARTED.has(line.status)) {
    const open = (deps.get(line.id) ?? []).filter((d) => !DONE.has(status.get(d)));
    if (open.length)
      problems.push(
        `${line.id} is "${line.status}" but depends on unfinished ${open.join(", ")}: lines follow their dependencies`,
      );
  }
}

const inProgress = all.filter((l) => l.status === "in_progress");
for (let i = 0; i < inProgress.length; i++) {
  for (let j = i + 1; j < inProgress.length; j++) {
    if (touchesOverlap(inProgress[i], inProgress[j])) {
      problems.push(
        `${inProgress[i].id} and ${inProgress[j].id} are both in progress without disjoint "touches"`,
      );
    }
  }
}

if (staged) problems.push(...changesSinceHead(readPlanAt("HEAD")));

if (problems.length) fail("plan check failed", problems);
console.log(`✔ plan ok — ${all.filter((l) => DONE.has(l.status)).length}/${all.length} lines done`);

/** Rules 5, 6 and 7: what the staged plan may change compared with HEAD (nothing to compare on the first commit). */
function changesSinceHead(head) {
  if (!head) return [];
  const found = [];
  const before = new Map(lines(head).map((l) => [l.id, l]));
  if (JSON.stringify(strip(head)) !== JSON.stringify(strip(plan)) && !human.planEdit()) {
    found.push(
      "plan structure changed: only `status` and `notes` may change (structural edits are human-only: HARNESS_PLAN_EDIT=1)",
    );
  }
  for (const line of all) {
    const previous = before.get(line.id);
    if (line.status === "provided" && previous && previous.status !== "provided" && !human.planEdit()) {
      found.push(
        `${line.id} marked "provided": only the human declares work delivered outside the loop (HARNESS_PLAN_EDIT=1)`,
      );
    }
    if (
      line.humanGate &&
      line.status === "done" &&
      previous?.status !== "done" &&
      human.gate() !== line.humanGate
    ) {
      found.push(
        `${line.id} closes human checkpoint ${line.humanGate}: only the human marks it done (HARNESS_HUMAN_GATE=${line.humanGate})`,
      );
    }
  }
  return found;
}

function strip(p) {
  const { milestones, ...rest } = p;
  return {
    ...rest,
    milestones: milestones.map((m) => ({
      ...m,
      lines: (m.lines ?? []).map(({ status: _s, notes: _n, ...kept }) => kept),
    })),
  };
}
