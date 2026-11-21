// Parallel lanes: selection, worktree per lane, serial verified integration — plus status and review prompt.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { line, makeRepo, planOf } from "./helpers.mjs";

let repo;
afterEach(() => repo?.cleanup());

const independent = (id, touches) => line(id, { dependsOn: ["M1.1"], touches });

function finishInLane(lanePath, id) {
  const lane = repo.at(lanePath);
  lane.setStatus(id, "done");
  lane.write(`src/${id}/index.ts`, "export {};\n");
  return lane.commit(`feat(core): do ${id}\n\nWhy.\n\nPlan: ${id}`);
}

describe("lanes", () => {
  it("keeps a plain plan sequential", () => {
    repo = makeRepo();
    const r = repo.node("lanes.mjs", ["ready"]);
    assert.match(r.out, /one line can run now/);
    assert.match(r.out, /M1\.1/);
    assert.doesNotMatch(r.out, /M1\.2/);
  });

  it("selects independent lines with disjoint touches, not overlapping ones", () => {
    repo = makeRepo({
      plan: planOf(
        line("M1.1", { status: "done" }),
        independent("M1.2", ["src/a/**"]),
        independent("M1.3", ["src/b/**"]),
        independent("M1.4", ["src/a/x/**"]),
      ),
    });
    const r = repo.node("lanes.mjs", ["ready"]);
    assert.match(r.out, /2 lines can run in parallel/);
    assert.match(r.out, /M1\.2/);
    assert.match(r.out, /M1\.3/);
    assert.doesNotMatch(r.out, /M1\.4/);
  });

  it("runs two lanes in worktrees and integrates them one at a time", () => {
    repo = makeRepo({
      plan: planOf(
        line("M1.1", { status: "done" }),
        independent("M1.2", ["src/M1.2/**"]),
        independent("M1.3", ["src/M1.3/**"]),
      ),
    });
    for (const id of ["M1.2", "M1.3"]) assert.equal(repo.node("lanes.mjs", ["start", id]).code, 0);
    const laneOf = (id) => `${repo.dir}-lanes-root/${id}`;
    assert.ok(existsSync(laneOf("M1.2")) && existsSync(laneOf("M1.3")));
    assert.match(repo.node("lanes.mjs", ["ready"]).out, /no lane can start/);

    for (const id of ["M1.2", "M1.3"]) assert.equal(finishInLane(laneOf(id), id).code, 0);
    for (const id of ["M1.2", "M1.3"]) {
      const r = repo.node("lanes.mjs", ["finish", id]);
      assert.equal(r.code, 0, r.out);
      assert.ok(!existsSync(laneOf(id)));
    }
    const plan = JSON.parse(repo.read("docs/plan/plan.json"));
    assert.deepEqual(
      plan.milestones[0].lines.map((l) => l.status),
      ["done", "done", "done"],
    );
    assert.equal(repo.node("plan-check.mjs").code, 0);
  });

  it("refuses to integrate a lane whose line is not done", () => {
    repo = makeRepo({ plan: planOf(line("M1.1", { status: "done" }), independent("M1.2", ["src/a/**"])) });
    repo.node("lanes.mjs", ["start", "M1.2"]);
    const r = repo.node("lanes.mjs", ["finish", "M1.2"]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /not done/);
  });
});

describe("status and review prompt", () => {
  it("names the next line and flags a human checkpoint", () => {
    repo = makeRepo({ plan: planOf(line("M1.1", { status: "done" }), line("M1.2", { humanGate: "A" })) });
    repo.write("docs/plan/progress/M1.1.md", "# M1.1 · done\nEvidence: tests green\n");
    const r = repo.node("status.mjs", ["--no-check"]);
    assert.match(r.out, /next: M1\.2 — HUMAN CHECKPOINT A/);
    assert.match(r.out, /Evidence: tests green/);
  });

  it("builds a review prompt with the line, the cited requirement text and the staged diff", () => {
    repo = makeRepo({ plan: planOf(line("M1.1", { status: "in_progress", content: "implements REQ-01" })) });
    repo.write("src/feature.ts", "export const feature = 1;\n");
    repo.git("add", "-A");
    const r = repo.node("review-prompt.mjs");
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /# Plan line M1\.1/);
    assert.match(r.out, /\*\*REQ-01\*\* A rule\./);
    assert.match(r.out, /\+export const feature = 1;/);
  });
});
