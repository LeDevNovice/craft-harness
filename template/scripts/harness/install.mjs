// One-time setup, run by the human after generating or cloning the project.
//   node scripts/harness/install.mjs
// Activates the git hooks, checks the Node version and repairs the skills links of the Claude Code
// and Gemini CLI adapters (symlinks can be lost on Windows checkouts).
import { chmodSync, existsSync, lstatSync, readdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { git, repoRoot } from "./lib.mjs";

const root = repoRoot();
const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(`✖ Node ${process.versions.node}: the harness scripts need Node 22 or later`);
  process.exit(1);
}

if (git(["rev-parse", "--git-dir"], { allowFail: true }) === null) git(["init", "-b", "main"], { cwd: root });
git(["config", "core.hooksPath", ".githooks"], { cwd: root });
for (const hook of readdirSync(join(root, ".githooks"))) chmodSync(join(root, ".githooks", hook), 0o755);
console.log("✔ git hooks active (.githooks)");

// .claude/skills belongs to the Claude Code adapter only (CLAUDE.md), not to Cursor or DeepSeek Harness.
const adapters = [...(existsSync(join(root, "CLAUDE.md")) ? [".claude"] : []), ".gemini"];
for (const adapter of adapters) {
  const skills = join(root, adapter, "skills");
  if (!existsSync(join(root, adapter)) || isLink(skills) || existsSync(skills)) continue;
  try {
    symlinkSync("../.agents/skills", skills, "junction");
    console.log(`✔ ${adapter}/skills → .agents/skills`);
  } catch {
    console.log(
      `· could not link ${adapter}/skills: copy .agents/skills there or enable symlinks (Windows: developer mode)`,
    );
  }
}

console.log(
  "\nNext: node scripts/harness/verify.mjs, then commit the harness as commit 0 (docs/harness/README.md).",
);

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
