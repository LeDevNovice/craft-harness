// Pre-tool-use hook shared by the harness adapters (Claude Code and Cursor via .claude/settings.json,
// Codex via .codex/hooks.json, DeepSeek Harness via its Claude Code hooks bridge).
// Refuses, before it happens, an edit to a human-owned file or a command that bypasses or weakens the
// gates. It is a convenience: the git hooks and CI stay the authority for every harness.
// Protocol: JSON on stdin; exit 2 + reason on stderr refuses the call (Claude Code, Codex);
// Cursor's beforeShellExecution gets a JSON permission answer on stdout.
import { HUMAN_VARIABLES, config, matchesAny, repoPath, repoRoot } from "./lib.mjs";

const BUILT_IN_FORBIDDEN = [
  // git accepts any unambiguous prefix of a long option (--no-ver) and clustered short flags (-nm).
  [
    /--no-v(?:e(?:r(?:i(?:fy?)?)?)?)?\b|\bgit\s+commit\b[^|;&]*\s-[a-zA-Z]*n[a-zA-Z]*\b/,
    "bypassing git hooks",
  ],
  [/\bgit\s+push\b[^|;&]*\s(--force\b|--force-with-lease\b|-f\b)/, "force push"],
  [/\bgit\s+(reset\s+--hard|rebase\b|filter-branch|filter-repo|commit\b[^|;&]*--amend)/, "rewriting history"],
  [/\bgit\s+branch\b[^|;&]*\s-D\b/, "force-deleting a branch"],
  [/\bgit\s+clean\b[^|;&]*\s-[a-zA-Z]*f/, "deleting untracked files"],
  [/\bcore\.hooksPath\b/, "changing the git hooks path"],
  [new RegExp(`\\b(${HUMAN_VARIABLES.join("|")})=`), "human-only override variable"],
];

let input = "";
for await (const chunk of process.stdin) input += chunk;
const payload = JSON.parse(input || "{}");
const root = repoRoot();
const { ownedPaths, forbiddenCommands } = config();
const forbidden = [
  ...BUILT_IN_FORBIDDEN,
  ...forbiddenCommands.map(({ pattern, reason }) => [new RegExp(pattern), reason]),
];

const event = payload.hook_event_name;
const tool = payload.tool_name;
const args = payload.tool_input ?? {};

if (event === "beforeShellExecution") {
  // Cursor: command at top level, answer on stdout.
  const why = commandProblem(String(payload.command ?? ""));
  console.log(
    JSON.stringify(
      why ? { permission: "deny", user_message: why, agent_message: refusal(why) } : { permission: "allow" },
    ),
  );
  process.exit(0);
}

const problem = ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)
  ? pathProblem(args.file_path ?? args.notebook_path)
  : tool === "apply_patch"
    ? patchProblem(String(args.command ?? args.input ?? args.patch ?? ""))
    : tool === "Bash" || tool === "Shell"
      ? commandProblem(String(args.command ?? ""))
      : null;
if (problem) {
  console.error(refusal(problem));
  process.exit(2);
}
process.exit(0);

function refusal(why) {
  return `Refused by scripts/harness/agent-hook.mjs: ${why}. Stop and report to the human instead (AGENTS.md › Boundaries).`;
}

function pathProblem(path) {
  const rel = path ? repoPath(String(path), root) : null;
  return rel && matchesAny(rel, ownedPaths) ? `${rel} is a human-owned file` : null;
}

function patchProblem(patch) {
  // Codex apply_patch envelope: "*** Add File: p", "*** Update File: p", "*** Delete File: p", "*** Move to: p".
  for (const match of patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) {
    const why = pathProblem(match[1].trim());
    if (why) return why;
  }
  return null;
}

function commandProblem(command) {
  for (const [re, why] of forbidden) if (re.test(command)) return why;
  // Heuristic: a shell write whose target is a human-owned path. The pre-commit guard catches the rest.
  for (const target of writeTargets(command)) {
    const rel = repoPath(target, root);
    if (rel && matchesAny(rel, ownedPaths)) return `shell write to ${rel}, a human-owned file`;
  }
  return null;
}

/** Paths a command writes to: redirections, tee, in-place editors, rm/truncate/chmod, last arg of mv/cp/ln. */
function writeTargets(command) {
  const targets = [];
  for (const match of command.matchAll(/>>?\s*([^\s;&|<>]+)/g)) targets.push(match[1]);
  for (const segment of command.split(/&&|\|\||[;|&]/)) {
    const words = segment
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    const operands = words.slice(1).filter((w) => !w.startsWith("-") && !w.startsWith(">"));
    const name = words[0];
    if (["tee", "rm", "truncate", "chmod", "unlink"].includes(name)) targets.push(...operands);
    else if (["mv", "cp", "ln", "install"].includes(name) && operands.length)
      targets.push(...(name === "mv" ? operands : operands.slice(-1)));
    else if ((name === "sed" || name === "perl") && words.some((w) => /^-[a-zA-Z]*i/.test(w)))
      targets.push(...operands.slice(1));
  }
  return targets;
}
