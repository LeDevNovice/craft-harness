// pre-commit guard on the staged diff. Refuses, whatever the harness that produced the change:
//   - edits to human-owned files (specs, requirements, ADRs, agent instructions, the harness itself);
//   - deleted, focused or skipped tests, and tests that stop naming a requirement id;
//   - weakened quality thresholds (type strictness, lint severity, coverage, budgets…).
// Human overrides: HARNESS_HUMAN=1 (owned files), HARNESS_ALLOW_TEST_CHANGE=1 (tests and thresholds).
// Test and threshold rules apply to files the agent may edit; owned files fall under the first rule.
import { config, fail, git, human, isTestFile, matchesAny, requirementIdsIn } from "./lib.mjs";

if (git(["rev-parse", "--git-dir"], { allowFail: true }) === null) {
  console.log("· guard: not a git repository yet, nothing staged to check");
  process.exit(0);
}

const { ownedPaths, tests, thresholds } = config();
const skipPatterns = tests.skipPatterns.map((p) => new RegExp(p));
const thresholdKeywords = thresholds.keywords.length ? new RegExp(thresholds.keywords.join("|"), "i") : null;

const ownedProblems = [];
const testProblems = [];

const status = git(["diff", "--cached", "--name-status", "--no-renames"]);
for (const row of status ? status.split("\n") : []) {
  const [kind, path] = row.split("\t");
  if (matchesAny(path, ownedPaths))
    ownedProblems.push(`${path}: human-owned file (${kind}). Report the needed change instead of making it.`);
  if (kind === "D" && isTestFile(path) && !matchesAny(path, ownedPaths))
    testProblems.push(`${path}: deleting a test file`);
}

const diff = git(["diff", "--cached", "--unified=0", "--no-color", "--no-ext-diff", "--no-renames"]) ?? "";
let current = "";
const removedIds = new Map();
const addedIds = new Map();
for (const row of diff.split("\n")) {
  if (row.startsWith("+++ ")) current = row.startsWith("+++ b/") ? row.slice(6) : current;
  if (row.startsWith("--- ") && row.slice(4).startsWith("a/")) current = row.slice(6);
  if (row.startsWith("+++") || row.startsWith("---")) continue;
  const added = row.startsWith("+");
  const removed = row.startsWith("-");
  if (!added && !removed) continue;
  const text = row.slice(1);

  if (matchesAny(current, ownedPaths)) continue;
  if (isTestFile(current)) {
    if (added && skipPatterns.some((re) => re.test(text)))
      testProblems.push(`${current}: focused or skipped test added → "${text.trim()}"`);
    for (const id of requirementIdsIn(text)) {
      const bucket = removed ? removedIds : addedIds;
      bucket.set(id, (bucket.get(id) ?? 0) + 1);
    }
  }
  if (removed && thresholdKeywords && matchesAny(current, thresholds.files) && thresholdKeywords.test(text)) {
    testProblems.push(
      `${current}: a quality threshold line changed ("${text.trim()}") — thresholds are human-owned`,
    );
  }
}
for (const [id, count] of removedIds) {
  if ((addedIds.get(id) ?? 0) < count) testProblems.push(`tests naming ${id} were removed or renamed`);
}

const problems = [...(human.any() ? [] : ownedProblems), ...(human.testChange() ? [] : testProblems)];
if (problems.length) fail("pre-commit guard refused the commit", problems);
console.log("✔ guard: no human-owned file, test or threshold weakened");
