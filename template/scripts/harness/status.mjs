// Session bootstrap: where are we, what is next, is the repository green?
//   node scripts/harness/status.mjs [--no-check]
// Its output is the first thing an agent reads (AGENTS.md › Start every session); harness adapters
// also inject it at session start.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DONE, config, git, lines, readPlanWorkingTree, readyLines, repoRoot } from "./lib.mjs";

const root = repoRoot();
const section = (title) => console.log(`\n== ${title} ==`);

section("Repository");
console.log(`directory: ${root}`);
console.log(
  `branch:    ${git(["rev-parse", "--abbrev-ref", "HEAD"], { allowFail: true }) ?? "(no commit yet)"}`,
);
const dirty = git(["status", "--porcelain"], { allowFail: true });
console.log(dirty ? `uncommitted changes:\n${dirty}` : "working tree clean");
const hooks = git(["config", "core.hooksPath"], { allowFail: true });
console.log(
  `git hooks: ${hooks === ".githooks" ? "active" : "NOT ACTIVE — the human runs: node scripts/harness/install.mjs"}`,
);

section("Last commits");
console.log(git(["log", "--oneline", "-8"], { allowFail: true }) ?? "(none)");

section("Plan");
const all = lines(readPlanWorkingTree());
console.log(`${all.filter((l) => DONE.has(l.status)).length}/${all.length} lines done`);
for (const line of all.filter((l) => l.status === "in_progress" || l.status === "blocked")) {
  console.log(
    `${line.status.toUpperCase()}: ${line.id} — ${line.message}${line.notes ? `\n  notes: ${line.notes}` : ""}`,
  );
}
const ready = readyLines(all);
if (!ready.length && !all.some((l) => !DONE.has(l.status))) console.log("plan complete");
for (const [index, line] of ready.entries()) {
  console.log(
    `${index === 0 ? "next" : "also ready (see lanes.mjs ready)"}: ${line.id}${line.humanGate ? ` — HUMAN CHECKPOINT ${line.humanGate}: stop and report` : ""}`,
  );
  if (index > 0) continue;
  console.log(`  message:      ${line.message}`);
  console.log(`  content:      ${line.content}`);
  console.log(`  verification: ${line.verification}`);
  if (line.touches) console.log(`  touches:      ${line.touches.join(", ")}`);
  if (line.notes) console.log(`  notes:        ${line.notes}`);
}

section("Last progress notes");
const finished = all.filter((l) => l.status === "done").slice(-3);
let shown = 0;
for (const line of finished) {
  const path = join(root, config().progressDir, `${line.id}.md`);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8").split("\n").slice(0, 15).join("\n");
  console.log(`--- ${config().progressDir}/${line.id}.md\n${text}`);
  shown++;
}
if (!shown) console.log("(none yet)");

section("Green check");
const check = config().commands.check;
if (process.argv.includes("--no-check")) {
  console.log("skipped (--no-check): run node scripts/harness/verify.mjs before any work");
} else if (!check) {
  console.log("no project check configured — run node scripts/harness/verify.mjs");
} else {
  try {
    execSync(check, { stdio: "inherit", cwd: root });
    console.log("GREEN");
  } catch {
    console.log("RED — making the repository green again is this session's only task.");
    process.exitCode = 1;
  }
}
