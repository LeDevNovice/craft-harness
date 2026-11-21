// Test helpers: a throwaway git repository carrying the harness scripts, hooks and a small plan.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const harnessDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hooksDir = resolve(harnessDir, "../../.githooks");

export const baseConfig = {
  plan: "docs/plan/plan.json",
  progressDir: "docs/plan/progress",
  planIdPattern: "M\\d+\\.\\d+",
  requirements: { file: "docs/requirements.md", idPattern: "REQ-\\d{2,}" },
  tests: {
    dirs: ["src"],
    filePattern: "\\.test\\.ts$",
    titlePattern: "\\b(?:describe|it|test)\\(\\s*([\"'`])(.*?)\\1",
    skipPatterns: ["\\b(describe|it|test)\\.(only|skip)\\b"],
  },
  ownedPaths: [
    "AGENTS.md",
    "docs/specs/**",
    "docs/requirements.md",
    "scripts/harness/**",
    ".githooks/**",
    "harness.config.json",
  ],
  thresholds: { files: ["tsconfig*.json"], keywords: ["strict"] },
  commands: { check: null, precommit: null },
  forbiddenCommands: [{ pattern: "\\bdeploy\\b", reason: "deploys are human actions" }],
  lanes: { root: "../{repo}-lanes-root", branchPrefix: "lane/" },
};

export function line(id, extra = {}) {
  return {
    id,
    message: `feat(core): do ${id}`,
    content: `content of ${id}`,
    verification: "npm test",
    status: "todo",
    ...extra,
  };
}

export function planOf(...lines) {
  return { version: 1, milestones: [{ id: "M1", title: "First", lines }] };
}

/** Clean environment: no human override leaks from the shell running the tests. */
function env(extra = {}) {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("HARNESS_") && !k.startsWith("GIT_")),
  );
  return {
    ...clean,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "t@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "t@example.com",
    ...extra,
  };
}

/** Operations on a working directory (the repository or one of its lane worktrees). */
export function view(dir, config = baseConfig) {
  const repo = {
    dir,
    write(path, content) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(
        join(dir, path),
        typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`,
      );
    },
    read(path) {
      return readFileSync(join(dir, path), "utf8");
    },
    rm(path) {
      rmSync(join(dir, path), { recursive: true, force: true });
    },
    setStatus(id, status) {
      const p = JSON.parse(repo.read(config.plan));
      for (const m of p.milestones) for (const l of m.lines) if (l.id === id) l.status = status;
      repo.write(config.plan, p);
    },
    git(...args) {
      return execFileSync("git", args, {
        cwd: dir,
        env: env(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    },
    /** Run a command; returns { code, out } without throwing. */
    run(command, args, extraEnv = {}, input) {
      const r = spawnSync(command, args, { cwd: dir, env: env(extraEnv), encoding: "utf8", input });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    },
    commit(message, extraEnv = {}) {
      repo.git("add", "-A");
      return repo.run("git", ["commit", "-q", "-m", message], extraEnv);
    },
    node(script, args = [], extraEnv = {}, input) {
      return repo.run(process.execPath, [`scripts/harness/${script}`, ...args], extraEnv, input);
    },
    at(other) {
      return view(other, config);
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
      rmSync(`${dir}-lanes-root`, { recursive: true, force: true });
    },
  };
  return repo;
}

export function makeRepo({
  config = baseConfig,
  plan,
  requirements = "- **REQ-01** A rule.\n- **REQ-02** Another rule.\n",
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "harness-test-"));
  const repo = view(dir, config);
  const testDir = join(harnessDir, "test");
  cpSync(harnessDir, join(dir, "scripts/harness"), {
    recursive: true,
    filter: (src) => src !== testDir && !src.startsWith(`${testDir}${sep}`),
  });
  cpSync(hooksDir, join(dir, ".githooks"), { recursive: true });
  repo.write("harness.config.json", config);
  repo.write(config.plan, plan ?? planOf(line("M1.1"), line("M1.2")));
  repo.write("docs/requirements.md", requirements);
  repo.write("docs/specs/product.md", "# Product\n");
  repo.write("AGENTS.md", "# Agents\n");
  repo.write("src/smoke.test.ts", 'it("smoke", () => {});\n');
  repo.git("init", "-q", "-b", "main");
  repo.git("config", "core.hooksPath", ".githooks");
  const first = repo.commit("chore: add the agent harness", { HARNESS_HUMAN: "1" });
  if (first.code !== 0) throw new Error(`initial commit failed:\n${first.out}`);
  return repo;
}
