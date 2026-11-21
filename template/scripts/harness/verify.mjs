// Definition-of-done gate. Run before every commit and show its output; pre-push and CI run it with --ci.
//   node scripts/harness/verify.mjs [--ci]
// The harness self-tests run with --ci only: the harness is human-owned, so a local commit cannot change it.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config, repoRoot } from "./lib.mjs";

const ci = process.argv.includes("--ci");
const { commands } = config();
const selfTests = ci && existsSync(join(repoRoot(), "scripts/harness/test"));
const steps = [
  ...(selfTests ? [["harness self-tests", 'node --test "scripts/harness/test/*.test.mjs"']] : []),
  ["plan", "node scripts/harness/plan-check.mjs"],
  ["requirements", "node scripts/harness/requirements-check.mjs"],
  ...(ci ? [] : [["guard (staged)", "node scripts/harness/guard.mjs"]]),
  ...(commands.check ? [["project check", commands.check]] : []),
];

const results = [];
for (const [name, command] of steps) {
  console.log(`\n── ${name}: ${command}`);
  try {
    execSync(command, { stdio: "inherit", cwd: repoRoot() });
    results.push([name, true]);
  } catch {
    results.push([name, false]);
  }
}

console.log("\n== Definition of done ==");
for (const [name, ok] of results) console.log(`${ok ? "✔" : "✖"} ${name}`);
if (!commands.check) console.log("· no project check configured yet (harness.config.json → commands.check)");
if (results.some(([, ok]) => !ok)) process.exit(1);
