// Parallel lanes: run independent plan lines at the same time, one writer per lane, merged one by one.
//   node scripts/harness/lanes.mjs ready           → lines that can run in parallel now (disjoint `touches`)
//   node scripts/harness/lanes.mjs start <id>      → create the lane: a git worktree on branch lane/<id>
//   node scripts/harness/lanes.mjs finish <id>     → merge a finished lane into the current branch, verify, clean up
//   node scripts/harness/lanes.mjs list            → open lanes
// Writes stay single-threaded per lane, and integration is serial and verified: a merge that conflicts
// or turns the repository red is aborted and reported, never forced.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import {
  DONE,
  config,
  fail,
  git,
  lines,
  readPlanAt,
  readPlanWorkingTree,
  readyLines,
  repoRoot,
  touchesOverlap,
} from "./lib.mjs";

const [command, id] = process.argv.slice(2);
const root = repoRoot();
const { lanes } = config();
const branchOf = (lineId) => `${lanes.branchPrefix}${lineId}`;
const pathOf = (lineId) => resolve(root, lanes.root.replace("{repo}", basename(root)), lineId);
const branchExists = (name) =>
  git(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`], { allowFail: true }) !== null;

switch (command) {
  case "ready":
    ready();
    break;
  case "start":
    start(required(id));
    break;
  case "finish":
    finish(required(id));
    break;
  case "list":
    console.log(git(["worktree", "list"]));
    break;
  default:
    fail("usage", ["node scripts/harness/lanes.mjs ready | start <id> | finish <id> | list"]);
}

function required(value) {
  if (!value) fail("missing line id", ["give the plan line id, e.g. M2.3"]);
  return value;
}

/** Greedy, in plan order: ready lines without a human gate whose touches are disjoint from every selected or running line. */
function selection() {
  const all = lines(readPlanWorkingTree());
  const running = all.filter((l) => l.status === "in_progress" || branchExists(branchOf(l.id)));
  const chosen = [];
  for (const line of readyLines(all)) {
    if (line.humanGate || branchExists(branchOf(line.id))) continue;
    if ([...running, ...chosen].some((other) => touchesOverlap(line, other))) continue;
    chosen.push(line);
    if (!line.touches?.length) break; // unknown footprint: this line runs alone
  }
  return chosen;
}

function ready() {
  const chosen = selection();
  if (!chosen.length) {
    console.log(
      "no lane can start: the next line is running, gated by a human, or waiting for its dependencies",
    );
    return;
  }
  console.log(chosen.length > 1 ? `${chosen.length} lines can run in parallel:` : "one line can run now:");
  for (const line of chosen)
    console.log(`  ${line.id}  ${line.message}${line.touches ? `  [${line.touches.join(", ")}]` : ""}`);
  console.log("\nStart each lane with: node scripts/harness/lanes.mjs start <id>");
}

function start(lineId) {
  if (!selection().some((l) => l.id === lineId))
    fail(`${lineId} cannot start a lane`, ["run `lanes.mjs ready` to see the lines that can"]);
  if (git(["status", "--porcelain"]))
    fail("working tree not clean", ["commit or stash before opening a lane"]);
  const path = pathOf(lineId);
  if (!relative(root, path).startsWith("..")) fail("lanes.root must be outside the repository", [path]);
  if (existsSync(path)) fail("lane directory exists", [path]);
  git(["worktree", "add", "-b", branchOf(lineId), path]);
  console.log(`✔ lane ${lineId} ready in ${path} (branch ${branchOf(lineId)})`);
  console.log(
    "Run one implementing agent there, in a fresh context: skill start-session, then implement-line for this line only.",
  );
}

function finish(lineId) {
  const branch = branchOf(lineId);
  if (!branchExists(branch)) fail(`no lane branch ${branch}`, []);
  if (git(["status", "--porcelain"]))
    fail("working tree not clean", ["integrate from a clean checkout of the base branch"]);
  const plan = readPlanAt(branch);
  const line = plan && lines(plan).find((l) => l.id === lineId);
  if (!line || !DONE.has(line.status))
    fail(`${lineId} is not done on ${branch}`, ["finish the line in its lane first"]);

  try {
    git(["merge", "--no-ff", "--no-commit", branch]);
  } catch {
    git(["merge", "--abort"], { allowFail: true });
    fail(`merging ${branch} conflicts`, [
      `in the lane (${pathOf(lineId)}): git merge ${git(["rev-parse", "--abbrev-ref", "HEAD"])}, resolve, run verify.mjs, commit the merge`,
      "then run finish again",
    ]);
  }
  try {
    execSync("node scripts/harness/verify.mjs", { stdio: "inherit", cwd: root });
  } catch {
    git(["merge", "--abort"], { allowFail: true });
    fail(`${lineId} turns the integrated repository red`, [
      "merge aborted; fix it in the lane, then run finish again",
    ]);
  }
  execSync("git commit --no-edit", { stdio: "inherit", cwd: root });
  git(["worktree", "remove", pathOf(lineId)], { allowFail: true });
  git(["branch", "-d", branch], { allowFail: true });
  console.log(`✔ ${lineId} integrated and its lane removed`);
}
