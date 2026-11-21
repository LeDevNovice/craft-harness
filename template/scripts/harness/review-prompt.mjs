// Builds a self-contained prompt for a fresh-context reviewer: the review instructions, the plan line,
// the exact text of the requirements it cites, and the diff — nothing from the implementing session.
//   node scripts/harness/review-prompt.mjs [--line <id>] [--range <a>..<b>]
// Default: the line in progress and the staged diff. Pipe it into any headless agent, for example
//   node scripts/harness/review-prompt.mjs | claude -p
//   node scripts/harness/review-prompt.mjs | codex exec -
// or give it to a subagent that has not seen the session.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  config,
  fail,
  git,
  lineText,
  lines,
  readPlanWorkingTree,
  repoRoot,
  requirementIdsIn,
} from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const root = repoRoot();

const all = lines(readPlanWorkingTree());
const lineId = option("--line") ?? all.find((l) => l.status === "in_progress")?.id;
const line = all.find((l) => l.id === lineId);
if (!line) fail("no plan line to review", ["pass --line <id>, or mark the line in_progress"]);

const range = option("--range");
const diff = range ? git(["diff", range]) : git(["diff", "--staged"]);
if (!diff) fail("empty diff", [range ? `nothing in ${range}` : "stage the change first (git add -A)"]);

const skillPath = join(root, ".agents/skills/review-change/SKILL.md");
const instructions = existsSync(skillPath)
  ? readFileSync(skillPath, "utf8").replace(/^---[\s\S]*?---\s*/, "")
  : "";

const requirementsPath = join(root, config().requirements.file);
const requirementsText = existsSync(requirementsPath)
  ? readFileSync(requirementsPath, "utf8").split("\n")
  : [];
const cited = requirementIdsIn(lineText(line)).map(
  (id) =>
    requirementsText.filter((row) => requirementIdsIn(row).includes(id)).join("\n") || `${id}: (not found)`,
);

console.log(`${instructions}

# Plan line ${line.id}

- message: ${line.message}
- content: ${line.content}
- verification: ${line.verification}

# Requirements it cites (exact text)

${cited.join("\n") || "(none)"}

# Diff under review

\`\`\`diff
${diff}
\`\`\`
`);
