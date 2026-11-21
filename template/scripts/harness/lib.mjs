// Shared helpers for the harness scripts. Node >= 22, no dependencies, any project language.
// Every rule a script enforces is configured in harness.config.json (human-owned).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const STATUSES = ["todo", "in_progress", "done", "provided", "blocked"];
export const DONE = new Set(["done", "provided"]);
export const STARTED = new Set(["in_progress", "done", "blocked"]);

const DEFAULTS = {
  plan: "docs/plan/plan.json",
  progressDir: "docs/plan/progress",
  planIdPattern: "M\\d+\\.\\d+",
  commitTypes: ["feat", "fix", "refactor", "test", "docs", "chore", "build", "ci", "perf", "revert"],
  requirements: { file: "docs/requirements.md", idPattern: "REQ-\\d{2,}" },
  tests: {
    dirs: ["."],
    filePattern: "(\\.(test|spec)\\.[cm]?[jt]sx?$)|((^|/)test_[^/]*\\.py$)|(_test\\.(py|go)$)",
    titlePattern: null,
    skipPatterns: [],
  },
  ownedPaths: [],
  thresholds: { files: [], keywords: [] },
  commands: { check: null, precommit: null },
  forbiddenCommands: [],
  lanes: { root: "../{repo}-lanes", branchPrefix: "lane/" },
};

/** Repository root (works inside linked worktrees too). */
export function repoRoot() {
  return git(["rev-parse", "--show-toplevel"], { allowFail: true }) ?? process.cwd();
}

let cached;
export function config() {
  if (cached) return cached;
  const path = join(repoRoot(), "harness.config.json");
  const raw = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  cached = {
    ...DEFAULTS,
    ...raw,
    requirements: { ...DEFAULTS.requirements, ...raw.requirements },
    tests: { ...DEFAULTS.tests, ...raw.tests },
    thresholds: { ...DEFAULTS.thresholds, ...raw.thresholds },
    commands: { ...DEFAULTS.commands, ...raw.commands },
    lanes: { ...DEFAULTS.lanes, ...raw.lanes },
  };
  return cached;
}

export function git(args, { allowFail = false, cwd } = {}) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (allowFail) return null;
    throw error;
  }
}

/** Human-only overrides. Agents must never set these (blocked by the agent hook, stated in AGENTS.md). */
export const human = {
  any: () => process.env.HARNESS_HUMAN === "1",
  gate: () => process.env.HARNESS_HUMAN_GATE ?? null,
  planEdit: () => process.env.HARNESS_PLAN_EDIT === "1",
  testChange: () => process.env.HARNESS_ALLOW_TEST_CHANGE === "1",
};
export const HUMAN_VARIABLES = [
  "HARNESS_HUMAN",
  "HARNESS_HUMAN_GATE",
  "HARNESS_PLAN_EDIT",
  "HARNESS_ALLOW_TEST_CHANGE",
];

// ---------- plan ----------

export function readPlanWorkingTree() {
  return JSON.parse(readFileSync(join(repoRoot(), config().plan), "utf8"));
}

/** Plan as committed in `ref` (default HEAD), or null when it does not exist there. */
export function readPlanAt(ref = "HEAD") {
  const raw = git(["show", `${ref}:${config().plan}`], { allowFail: true });
  return raw === null ? null : JSON.parse(raw);
}

/** Plan as staged in the index (what the commit will contain). */
export function readPlanStaged() {
  const raw = git(["show", `:${config().plan}`], { allowFail: true });
  return raw === null ? readPlanWorkingTree() : JSON.parse(raw);
}

/** Flat list of plan lines, in plan order, each with its milestone id. */
export function lines(plan) {
  return plan.milestones.flatMap((m) => (m.lines ?? []).map((l) => ({ ...l, milestone: m.id })));
}

/**
 * Dependencies of each line. Explicit `dependsOn` wins; otherwise a line depends on the previous
 * non-provided line, which makes a plain plan strictly sequential. "provided" lines (delivered by the
 * human with the harness) take no part in the ordering.
 */
export function dependencies(all) {
  const deps = new Map();
  let previous = null;
  for (const line of all) {
    if (line.status === "provided") continue;
    deps.set(line.id, line.dependsOn ?? (previous ? [previous] : []));
    previous = line.id;
  }
  return deps;
}

/** Lines whose status is todo and whose dependencies are all done. */
export function readyLines(all) {
  const status = new Map(all.map((l) => [l.id, l.status]));
  const deps = dependencies(all);
  return all.filter(
    (l) => l.status === "todo" && (deps.get(l.id) ?? []).every((d) => DONE.has(status.get(d))),
  );
}

export function requirementIdsIn(text) {
  const re = new RegExp(`\\b${config().requirements.idPattern}\\b`, "g");
  return [...new Set(String(text ?? "").match(re) ?? [])];
}

export function lineText(line) {
  return [line.message, line.content, line.verification, ...(line.requirements ?? [])].join(" ");
}

// ---------- paths and globs ----------

/** Minimal glob → RegExp: `**` any depth, `*` within a segment, `?` one char. Anchored, `/`-separated. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(path, globs) {
  return globs.some((g) => globToRegExp(g).test(path));
}

/** Static prefix of a glob ("src/a/**" → "src/a/"). Two globs may overlap when one prefix starts the other. */
export function staticPrefix(glob) {
  const index = glob.search(/[*?[]/);
  return index === -1 ? glob : glob.slice(0, index);
}

export function globsMayOverlap(a, b) {
  const pa = staticPrefix(a);
  const pb = staticPrefix(b);
  return pa.startsWith(pb) || pb.startsWith(pa);
}

/** Conservative: unknown `touches` overlaps everything. */
export function touchesOverlap(lineA, lineB) {
  if (!lineA.touches?.length || !lineB.touches?.length) return true;
  return lineA.touches.some((a) => lineB.touches.some((b) => globsMayOverlap(a, b)));
}

/** Path relative to the repo root with `/` separators, or null when outside the repo. */
export function repoPath(path, root = repoRoot()) {
  const rel = relative(root, resolve(root, path));
  if (rel.startsWith("..") || rel === "") return null;
  return rel.split(sep).join("/");
}

export function isTestFile(path) {
  return new RegExp(config().tests.filePattern).test(path);
}

export function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, predicate, acc);
    else if (predicate(path)) acc.push(path);
  }
  return acc;
}

export function fail(title, problems) {
  console.error(`\n✖ ${title}`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}
