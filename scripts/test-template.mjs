// End-to-end test of the template: generate each variant with Copier, install it, run its full gate
// (harness self-tests included), make commit 0, then play one agent cycle and check that the gates
// accept the honest path and refuse the shortcuts.
//   node scripts/test-template.mjs [--keep]
// Needs: git, Node ≥ 22, uv (uvx copier), pnpm for the TypeScript variants. Run from a clean, committed checkout.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const template = resolve(import.meta.dirname, "..");
const keep = process.argv.includes("--keep");
const variants = [
  { name: "typescript-default", data: { project_name: "Demo App", owner: "octocat" } },
  { name: "typescript-all-harnesses", data: { project_name: "All Harnesses", owner: "octocat", harnesses: ["claude-code", "codex", "deepseek-harness", "cursor", "copilot", "gemini-cli"] } },
  { name: "agnostic-codex-copilot", data: { project_name: "Py Service", owner: "octocat", profile: "none", harnesses: ["codex", "copilot", "gemini-cli"], requirement_prefix: "RG", plan_prefix: "J" } },
];

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("HARNESS_")));
Object.assign(env, { GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "t@example.com" });

let failures = 0;
for (const variant of variants) {
  const dir = join(mkdtempSync(join(tmpdir(), "craft-harness-")), variant.name);
  console.log(`\n=== ${variant.name} → ${dir}`);
  try {
    runVariant(variant, dir);
    console.log(`✔ ${variant.name}`);
  } catch (error) {
    failures++;
    console.error(`✖ ${variant.name}: ${error.message}`);
  } finally {
    if (!keep) rmSync(dir, { recursive: true, force: true });
  }
}
if (failures) process.exit(1);
console.log("\n✔ every variant generated, verified and played through one agent cycle");

function runVariant({ data }, dir) {
  const args = ["copier", "copy", "--defaults", "--vcs-ref", "HEAD"];
  for (const [key, value] of Object.entries(data)) args.push("-d", `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
  must("uvx", [...args, template, dir], template);
  const ts = (data.profile ?? "typescript") === "typescript";
  const plan = data.plan_prefix ?? "M";
  const req = data.requirement_prefix ?? "REQ";
  const sh = (cmd, cmdArgs, extra = {}, input) => run(cmd, cmdArgs, dir, extra, input);

  must("node", ["scripts/harness/install.mjs"], dir);
  if (ts) must("pnpm", ["install"], dir);
  must("node", ["scripts/harness/verify.mjs", "--ci"], dir);
  must("git", ["add", "-A"], dir);
  must("git", ["commit", "-q", "-m", "chore: add the agent harness"], dir, { HARNESS_HUMAN: "1" });

  // Checkpoint A: the human writes a requirement and adopts a first milestone with one line.
  const planPath = join(dir, "docs/plan/plan.json");
  const p = JSON.parse(readFileSync(planPath, "utf8"));
  const gate = p.milestones[0].lines.at(-1);
  gate.status = "done";
  p.milestones.push({
    id: `${plan}1`,
    title: "First slice",
    lines: [{ id: `${plan}1.1`, message: "feat(core): greet a visitor by name", content: `${req}-01`, verification: "unit test", status: "todo" }],
  });
  writeFileSync(planPath, `${JSON.stringify(p, null, 2)}\n`);
  writeFileSync(join(dir, "docs/requirements.md"), `# Requirements\n\n- **${req}-01** A visitor is greeted by name.\n`);
  must("git", ["add", "-A"], dir);
  must("git", ["commit", "-q", "-m", "docs: adopt the first milestone"], dir, { HARNESS_HUMAN: "1", HARNESS_PLAN_EDIT: "1", HARNESS_HUMAN_GATE: "A" });

  // Agent: shortcuts are refused.
  expectRefused(sh("git", ["commit", "--allow-empty", "-q", "-m", "feat(core): greet a visitor by name"]), "missing trailer");
  writeFileSync(join(dir, "docs/specs/product.md"), "# edited by the agent\n");
  must("git", ["add", "-A"], dir);
  expectRefused(sh("git", ["commit", "-q", "-m", `docs: tweak\n\nPlan: ${plan}1.1`]), "human-owned file");
  must("git", ["checkout", "HEAD", "--", "docs/specs/product.md"], dir);
  if (ts) {
    // The files that define "green" are human-owned, and the gate does not run an agent-editable script.
    const weakenings = [
      ["tsconfig.json", '"noEmit": true,', '"noEmit": true,\n    "strict": false,'],
      ["vitest.config.ts", 'include: ["src/**/*.test.ts"],', 'include: ["src/**/*.test.ts"],\n    exclude: ["src/smoke.test.ts"],'],
    ];
    for (const [file, from, to] of weakenings) {
      writeFileSync(join(dir, file), readFileSync(join(dir, file), "utf8").replace(from, to));
      must("git", ["add", "-A"], dir);
      expectRefused(sh("git", ["commit", "-q", "-m", `fix: relax\n\nPlan: ${plan}1.1`]), `${file}: human-owned file`);
      must("git", ["reset", "-q", "--hard"], dir);
    }
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    pkg.scripts.check = "true";
    writeFileSync(join(dir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
    writeFileSync(join(dir, "src/broken.ts"), 'export const broken: number = "not a number";\n');
    expectRefused(sh("node", ["scripts/harness/verify.mjs"]), "✖ project check");
    must("git", ["reset", "-q", "--hard"], dir);
    rmSync(join(dir, "src/broken.ts"));
  }
  const hook = sh("node", ["scripts/harness/agent-hook.mjs"], {}, JSON.stringify({ tool_name: "Bash", tool_input: { command: "git commit --no-verify -m x" } }));
  if (hook.code !== 2) throw new Error("agent hook did not refuse --no-verify");

  // Agent: the honest path — test naming the requirement, code, plan status, progress note, planned commit.
  const testFile = ts ? "src/greet.test.ts" : "tests/test_greet.py";
  if (ts) {
    writeFileSync(join(dir, "src/greet.ts"), "export const greet = (name: string): string => `Hello, ${name}!`;\n");
    writeFileSync(join(dir, testFile), `import { expect, it } from "vitest";\n\nimport { greet } from "./greet.ts";\n\nit("${req}-01 — a visitor is greeted by name", () => {\n  expect(greet("Ada")).toBe("Hello, Ada!");\n});\n`);
  } else {
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, testFile), `def test_greet():\n    """${req}-01 — a visitor is greeted by name."""\n    assert "Hello, Ada!" == "Hello, Ada!"\n`, { flag: "w" });
  }
  setStatus(planPath, `${plan}1.1`, "done");
  writeFileSync(join(dir, `docs/plan/progress/${plan}1.1.md`), `# ${plan}1.1 · done\nEvidence: verify green.\n`);
  must("node", ["scripts/harness/verify.mjs"], dir);
  must("git", ["add", "-A"], dir);
  expectRefused(sh("git", ["commit", "-q", "-m", `feat(core): greet visitors\n\nPlan: ${plan}1.1`]), "exactly the planned message");
  must("git", ["commit", "-q", "-m", `feat(core): greet a visitor by name\n\n${req}-01.\n\nPlan: ${plan}1.1`], dir);

  // Agent: weakening the new test afterwards is refused.
  writeFileSync(join(dir, testFile), readFileSync(join(dir, testFile), "utf8").replace(`${req}-01 — `, ""));
  must("git", ["add", "-A"], dir);
  expectRefused(sh("git", ["commit", "-q", "-m", `test: rename\n\nPlan: ${plan}1.1`]), `tests naming ${req}-01 were removed`);
  must("git", ["reset", "-q", "--hard"], dir);

  const status = sh("node", ["scripts/harness/status.mjs"]);
  if (status.code !== 0 || !status.out.includes("plan complete")) throw new Error(`status after the cycle:\n${status.out}`);
  must("node", ["scripts/harness/verify.mjs", "--ci"], dir);
}

function setStatus(path, id, status) {
  const p = JSON.parse(readFileSync(path, "utf8"));
  for (const m of p.milestones) for (const l of m.lines) if (l.id === id) l.status = status;
  writeFileSync(path, `${JSON.stringify(p, null, 2)}\n`);
}

function run(cmd, args, cwd, extra = {}, input) {
  const r = spawnSync(cmd, args, { cwd, env: { ...env, ...extra }, encoding: "utf8", input });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function must(cmd, args, cwd, extra = {}) {
  const r = run(cmd, args, cwd, extra);
  if (r.code !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.out}`);
  return r.out;
}

function expectRefused(result, fragment) {
  if (result.code === 0) throw new Error(`expected a refusal containing "${fragment}", but it was accepted`);
  if (!result.out.includes(fragment)) throw new Error(`refused for another reason (wanted "${fragment}"):\n${result.out}`);
  console.log(`  ✔ refused: ${fragment}`);
}

