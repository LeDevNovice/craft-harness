// commit-msg hook: Conventional Commits header + a `Plan:` trailer consistent with the plan.
//   node scripts/harness/commit-msg.mjs <path-to-COMMIT_EDITMSG>
// - The commit that completes a line uses the line's planned message verbatim, and completes one line only.
// - `Plan: <id>a` (letter suffix) marks a preparatory `refactor:` commit before line <id> (Tidy First).
// - fix/docs/test/refactor commits may reference a line without completing it.
// - Merge commits of lane branches are accepted as is: each lane commit already passed these checks.
import { existsSync, readFileSync } from "node:fs";
import { DONE, config, fail, git, human, lines, readPlanAt, readPlanStaged } from "./lib.mjs";

const raw = readFileSync(process.argv[2], "utf8");
const message = raw
  .split("\n")
  .filter((l) => !l.startsWith("#"))
  .join("\n")
  .trim();
const [header] = message.split("\n");
const { commitTypes, planIdPattern } = config();

const mergeHead = git(["rev-parse", "--git-path", "MERGE_HEAD"], { allowFail: true });
if (mergeHead && existsSync(mergeHead)) {
  if (!/^Merge (branch|remote-tracking branch) '[^']+'/.test(header) && !headerIsConventional(header)) {
    fail("commit message refused", [
      `merge header "${header}" is neither git's default merge message nor a Conventional Commit`,
    ]);
  }
  process.exit(0);
}

const problems = [];
if (!headerIsConventional(header)) {
  problems.push(
    `header "${header}" is not a Conventional Commit: type(scope): description, ≤ 100 chars, type in ${commitTypes.join("|")}`,
  );
}

const trailer = message.match(new RegExp(`^Plan: (${planIdPattern})([a-z]?)$`, "m"));
if (!trailer && !human.any())
  problems.push(
    `missing trailer "Plan: <line id>" on its own line (or "<line id>a" for a preparatory refactor)`,
  );
if (trailer) problems.push(...trailerProblems(trailer[1], trailer[2]));

if (problems.length) fail("commit message refused", problems);

function headerIsConventional(text) {
  return new RegExp(`^(${commitTypes.join("|")})(\\([a-z0-9-]+\\))?!?: \\S.{0,99}$`).test(text);
}

/** Problems with a `Plan:` trailer, judged against the staged plan and the plan in HEAD. */
function trailerProblems(id, suffix) {
  const staged = lines(readPlanStaged());
  const head = readPlanAt("HEAD");
  const before = new Map(head ? lines(head).map((l) => [l.id, l.status]) : []);
  const line = staged.find((l) => l.id === id);
  if (!line) return [`Plan: ${id} does not exist in the plan`];

  const completedNow = staged.filter((l) => DONE.has(l.status) && !DONE.has(before.get(l.id) ?? "todo"));
  const type = header.split(/[(:!]/)[0];
  if (suffix) {
    const found = [];
    if (type !== "refactor")
      found.push(
        `Plan: ${id}${suffix} is reserved for "refactor:" commits (structure only, no behaviour change)`,
      );
    if (completedNow.length) found.push(`a "${id}${suffix}" refactor must not complete plan lines`);
    return found;
  }
  if (completedNow.length > 1)
    return [`one commit completes one line; this one completes ${completedNow.map((l) => l.id).join(", ")}`];
  if (completedNow.length === 1 && completedNow[0].id !== id)
    return [`this commit completes ${completedNow[0].id} but its trailer names ${id}`];
  if (completedNow.length === 1) {
    return header === line.message
      ? []
      : [`header must be exactly the planned message:\n      ${line.message}`];
  }
  if (line.humanGate) return []; // work towards a checkpoint is committed by the agent; only the human closes it
  if (!["fix", "docs", "test", "refactor"].includes(type)) {
    return [`"${type}" commit for ${id} must complete that line (status → done in the plan, same commit)`];
  }
  return [];
}
