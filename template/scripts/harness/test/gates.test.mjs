// The git gates, exercised through real commits in a throwaway repository.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { baseConfig, line, makeRepo, planOf } from "./helpers.mjs";

let repo;
afterEach(() => repo?.cleanup());

function completeLine(r, id, { message = `feat(core): do ${id}`, trailer = `Plan: ${id}`, env = {} } = {}) {
  r.setStatus(id, "done");
  r.write(`src/${id}.ts`, `export const x = "${id}";\n`);
  return r.commit(`${message}\n\nWhy.\n\n${trailer}`, env);
}

describe("commit-msg", () => {
  it("accepts the commit that completes the next line with its planned message", () => {
    repo = makeRepo();
    const r = completeLine(repo, "M1.1");
    assert.equal(r.code, 0, r.out);
  });

  it("refuses a completing commit whose header differs from the plan", () => {
    repo = makeRepo();
    const r = completeLine(repo, "M1.1", { message: "feat(core): something else" });
    assert.notEqual(r.code, 0);
    assert.match(r.out, /exactly the planned message/);
  });

  it("refuses a commit without a Plan trailer", () => {
    repo = makeRepo();
    const r = completeLine(repo, "M1.1", { trailer: "" });
    assert.notEqual(r.code, 0);
    assert.match(r.out, /missing trailer/);
  });

  it("refuses a header that is not a Conventional Commit", () => {
    repo = makeRepo();
    repo.write("src/a.ts", "export {};\n");
    const r = repo.commit("Added stuff\n\nPlan: M1.1");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /not a Conventional Commit/);
  });

  it("refuses completing two lines in one commit", () => {
    repo = makeRepo();
    repo.setStatus("M1.1", "done");
    const r = completeLine(repo, "M1.2");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /one commit completes one line/);
  });

  it("reserves the letter suffix for refactor commits that complete nothing", () => {
    repo = makeRepo();
    repo.write("src/a.ts", "export {};\n");
    assert.equal(repo.commit("refactor(core): extract helper\n\nPlan: M1.1a").code, 0);
    repo.write("src/b.ts", "export {};\n");
    const r = repo.commit("feat(core): sneak a feature\n\nPlan: M1.1a");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /reserved for "refactor:"/);
  });

  it("lets a feat commit reference a line only by completing it", () => {
    repo = makeRepo();
    repo.write("src/a.ts", "export {};\n");
    const r = repo.commit("feat(core): half of it\n\nPlan: M1.1");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /must complete that line/);
  });
});

describe("plan-check", () => {
  it("refuses a line done before the line it depends on", () => {
    repo = makeRepo();
    const r = completeLine(repo, "M1.2");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /depends on unfinished M1\.1/);
  });

  it("refuses structural plan edits by the agent and accepts them from the human", () => {
    repo = makeRepo();
    repo.write("docs/plan/plan.json", planOf(line("M1.1", { content: "rewritten" }), line("M1.2")));
    const refused = repo.commit("docs: rewrite the plan\n\nPlan: M1.1");
    assert.notEqual(refused.code, 0);
    assert.match(refused.out, /plan structure changed/);
    const accepted = repo.commit("docs: rewrite the plan", { HARNESS_HUMAN: "1", HARNESS_PLAN_EDIT: "1" });
    assert.equal(accepted.code, 0, accepted.out);
  });

  it("lets only the human close a checkpoint line", () => {
    repo = makeRepo({ plan: planOf(line("M1.1", { humanGate: "A", message: "docs: checkpoint A" })) });
    repo.setStatus("M1.1", "done");
    const refused = repo.commit("docs: checkpoint A\n\nPlan: M1.1");
    assert.notEqual(refused.code, 0);
    assert.match(refused.out, /only the human marks it done/);
    const accepted = repo.commit("docs: checkpoint A\n\nPlan: M1.1", { HARNESS_HUMAN_GATE: "A" });
    assert.equal(accepted.code, 0, accepted.out);
  });

  it("allows lines in progress together only with disjoint touches", () => {
    const independent = (id, touches) => line(id, { dependsOn: ["M1.1"], touches });
    repo = makeRepo({
      plan: planOf(
        line("M1.1", { status: "done" }),
        independent("M1.2", ["src/a/**"]),
        independent("M1.3", ["src/b/**"]),
      ),
    });
    repo.setStatus("M1.2", "in_progress");
    repo.setStatus("M1.3", "in_progress");
    assert.equal(repo.node("plan-check.mjs").code, 0);
    repo.write(
      "docs/plan/plan.json",
      planOf(
        line("M1.1", { status: "done" }),
        independent("M1.2", ["src/**"]),
        independent("M1.3", ["src/b/**"]),
      ),
    );
    repo.setStatus("M1.2", "in_progress");
    repo.setStatus("M1.3", "in_progress");
    const r = repo.node("plan-check.mjs");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /without disjoint "touches"/);
  });

  it("refuses dependsOn pointing at a later or unknown line", () => {
    repo = makeRepo();
    repo.write(
      "docs/plan/plan.json",
      planOf(line("M1.1", { dependsOn: ["M1.2"] }), line("M1.2"), line("M1.3", { dependsOn: ["M9.9"] })),
    );
    const r = repo.node("plan-check.mjs");
    assert.match(r.out, /not earlier in the plan/);
    assert.match(r.out, /unknown line M9\.9/);
  });
});

describe("guard", () => {
  it("refuses an edit to a human-owned file unless the human commits it", () => {
    repo = makeRepo();
    repo.write("docs/specs/product.md", "# Product, edited\n");
    const refused = repo.commit("docs: tweak spec\n\nPlan: M1.1");
    assert.notEqual(refused.code, 0);
    assert.match(refused.out, /human-owned file/);
    assert.equal(repo.commit("docs: tweak spec", { HARNESS_HUMAN: "1" }).code, 0);
  });

  it("leaves human-owned files, harness tests included, to the ownership rule", () => {
    repo = makeRepo();
    repo.write("scripts/harness/fixture.test.mjs", 'it.skip("fixture", () => {});\n');
    assert.equal(repo.commit("test: harness fixture", { HARNESS_HUMAN: "1" }).code, 0);
  });

  it("refuses deleting a test file", () => {
    repo = makeRepo();
    repo.rm("src/smoke.test.ts");
    const r = repo.commit("test: drop smoke\n\nPlan: M1.1");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /deleting a test file/);
  });

  it("refuses a focused or skipped test", () => {
    repo = makeRepo();
    repo.write("src/smoke.test.ts", 'it.skip("smoke", () => {});\n');
    const r = repo.commit("test: skip smoke\n\nPlan: M1.1");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /focused or skipped test/);
  });

  it("refuses removing a requirement id from tests, and the human may allow it", () => {
    repo = makeRepo();
    repo.write("src/rule.test.ts", 'it("REQ-01 — a rule holds", () => {});\n');
    assert.equal(repo.commit("test: cover REQ-01\n\nPlan: M1.1").code, 0);
    repo.write("src/rule.test.ts", 'it("a rule holds", () => {});\n');
    const refused = repo.commit("test: rename\n\nPlan: M1.1");
    assert.notEqual(refused.code, 0);
    assert.match(refused.out, /tests naming REQ-01 were removed/);
    assert.equal(repo.commit("test: rename\n\nPlan: M1.1", { HARNESS_ALLOW_TEST_CHANGE: "1" }).code, 0);
  });

  it("refuses weakening a quality threshold", () => {
    repo = makeRepo();
    repo.write("tsconfig.json", '{\n  "strict": true\n}\n');
    assert.equal(repo.commit("fix(build): add tsconfig\n\nPlan: M1.1").code, 0);
    repo.write("tsconfig.json", "{\n}\n");
    const r = repo.commit("fix(build): relax\n\nPlan: M1.1");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /quality threshold/);
  });
});

describe("requirements-check", () => {
  it("refuses a finished line whose requirement no test names, then accepts once tested", () => {
    repo = makeRepo({ plan: planOf(line("M1.1", { content: "implements REQ-02" })) });
    repo.setStatus("M1.1", "done");
    const refused = repo.commit("feat(core): do M1.1\n\nPlan: M1.1");
    assert.notEqual(refused.code, 0);
    assert.match(refused.out, /REQ-02 .* has no test title naming it/);
    repo.write("src/rule.test.ts", 'describe("REQ-02 — another rule", () => {});\n');
    assert.equal(repo.commit("feat(core): do M1.1\n\nPlan: M1.1").code, 0);
  });

  it("refuses a requirement id that the requirements file does not define", () => {
    repo = makeRepo();
    repo.write("docs/plan/plan.json", planOf(line("M1.1", { content: "implements REQ-77", status: "done" })));
    const r = repo.node("requirements-check.mjs");
    assert.notEqual(r.code, 0);
    assert.match(r.out, /REQ-77 .* is not defined/);
  });

  it("in a language-agnostic setup, finds the id anywhere in a test file but never in human-owned files", () => {
    const agnostic = {
      ...baseConfig,
      tests: {
        ...baseConfig.tests,
        dirs: ["."],
        filePattern: "(^|/)test_[^/]*\\.py$|\\.test\\.mjs$",
        titlePattern: null,
      },
    };
    repo = makeRepo({ config: agnostic });
    repo.write("scripts/harness/fixture.test.mjs", "// mentions REQ-02 as a fixture\n");
    repo.write("docs/plan/plan.json", planOf(line("M1.1", { content: "implements REQ-02", status: "done" })));
    const fooled = repo.node("requirements-check.mjs");
    assert.notEqual(fooled.code, 0);
    assert.match(fooled.out, /REQ-02 .* has no test file naming it/);
    repo.write("tests/test_rule.py", 'def test_another_rule():\n    """REQ-02 — another rule."""\n');
    assert.equal(repo.node("requirements-check.mjs").code, 0);
  });
});
