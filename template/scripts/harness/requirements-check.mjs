// Traceability: every requirement id cited by a finished plan line is named by at least one test,
// and exists in the requirements file.
//   node scripts/harness/requirements-check.mjs
// With tests.titlePattern set (a regex whose group 2 is the test title), the id must appear in a test
// title; otherwise anywhere in a test file (docstring, marker, comment) — for languages whose test
// names cannot hold an id.
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  DONE,
  matchesAny,
  config,
  fail,
  isTestFile,
  lineText,
  lines,
  readPlanWorkingTree,
  repoRoot,
  requirementIdsIn,
  walk,
} from "./lib.mjs";

const root = repoRoot();
const { requirements, tests } = config();
const required = new Map(); // requirement id → plan ids citing it
for (const line of lines(readPlanWorkingTree())) {
  if (!DONE.has(line.status) || line.status === "provided") continue;
  for (const id of requirementIdsIn(lineText(line))) required.set(id, [...(required.get(id) ?? []), line.id]);
}

const problems = [];
const requirementsPath = join(root, requirements.file);
const known = existsSync(requirementsPath)
  ? new Set(requirementIdsIn(readFileSync(requirementsPath, "utf8")))
  : new Set();
for (const [id, by] of required) {
  if (!known.has(id))
    problems.push(`${id} (cited by ${by.join(", ")}) is not defined in ${requirements.file}`);
}

const title = tests.titlePattern ? new RegExp(tests.titlePattern, "g") : null;
const tested = new Set();
// Human-owned files (the harness's own tests among them) never count as coverage of a requirement.
const files = tests.dirs.flatMap((dir) =>
  walk(join(root, dir), (p) => {
    const rel = relative(root, p).split("\\").join("/");
    return isTestFile(rel) && !matchesAny(rel, config().ownedPaths);
  }),
);
for (const file of new Set(files)) {
  const source = readFileSync(file, "utf8");
  if (title)
    for (const match of source.matchAll(title)) for (const id of requirementIdsIn(match[2])) tested.add(id);
  else for (const id of requirementIdsIn(source)) tested.add(id);
}
for (const [id, by] of required) {
  if (!tested.has(id))
    problems.push(`${id} (cited by ${by.join(", ")}) has no test ${title ? "title" : "file"} naming it`);
}

if (problems.length) fail("requirements check failed", problems);
console.log(`✔ requirements: ${required.size} cited requirement(s) defined and covered by named tests`);
