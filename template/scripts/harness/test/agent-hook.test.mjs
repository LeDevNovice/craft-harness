// The pre-tool-use hook shared by the harness adapters, fed the payloads each harness sends.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { makeRepo } from "./helpers.mjs";

let repo;
before(() => (repo = makeRepo()));
after(() => repo.cleanup());

const hook = (payload) => repo.node("agent-hook.mjs", [], {}, JSON.stringify(payload));
const bash = (command) => hook({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });

describe("agent hook — Claude Code payloads", () => {
  it("refuses editing a human-owned file, by absolute or relative path", () => {
    for (const file_path of [`${repo.dir}/docs/specs/product.md`, "AGENTS.md"]) {
      const r = hook({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path } });
      assert.equal(r.code, 2, file_path);
      assert.match(r.out, /human-owned file/);
    }
  });

  it("allows editing product code", () => {
    assert.equal(
      hook({
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { file_path: `${repo.dir}/src/a.ts` },
      }).code,
      0,
    );
  });

  it("refuses commands that bypass or weaken the gates", () => {
    for (const command of [
      "git commit --no-verify -m x",
      "git commit -n -m x",
      "git commit --no-ver -m x",
      "git commit --no-verif -m x",
      "git commit -nm x",
      "git commit -an -m x",
      "git merge --no-verify lane/M1.2",
      "git push --no-verify origin main",
      "git push --force origin main",
      "git reset --hard HEAD~1",
      "git commit --amend",
      "git rebase -i HEAD~3",
      "git branch -D lane/M1.2",
      "git clean -fd",
      "git config core.hooksPath /dev/null",
      "HARNESS_HUMAN=1 git commit -m x",
      "npm run deploy",
    ]) {
      assert.equal(bash(command).code, 2, command);
    }
  });

  it("refuses shell writes to human-owned files but not reads or output redirections elsewhere", () => {
    assert.equal(bash("echo x > docs/specs/product.md").code, 2);
    assert.equal(bash("sed -i 's/a/b/' AGENTS.md").code, 2);
    assert.equal(bash("rm docs/requirements.md").code, 2);
    assert.equal(bash("node scripts/harness/verify.mjs > /tmp/verify.log 2>&1").code, 0);
    assert.equal(bash("cat docs/specs/product.md | head -5").code, 0);
    assert.equal(bash("cp docs/specs/product.md /tmp/copy.md").code, 0);
    assert.equal(bash("git commit -m 'feat: x'").code, 0);
    assert.equal(bash("git commit -am 'fix: x'").code, 0);
    assert.equal(bash("git commit --no-edit").code, 0);
    assert.equal(bash("git merge --no-ff --no-commit lane/M1.2").code, 0);
  });
});

describe("agent hook — other harnesses", () => {
  it("reads Codex apply_patch envelopes", () => {
    const patch = (path) => `*** Begin Patch\n*** Update File: ${path}\n@@\n-a\n+b\n*** End Patch`;
    const call = (path) =>
      hook({ hook_event_name: "PreToolUse", tool_name: "apply_patch", tool_input: { command: patch(path) } });
    assert.equal(call("scripts/harness/guard.mjs").code, 2);
    assert.equal(call("src/a.ts").code, 0);
  });

  it("answers Cursor's beforeShellExecution on stdout", () => {
    const denied = JSON.parse(hook({ hook_event_name: "beforeShellExecution", command: "git push -f" }).out);
    assert.equal(denied.permission, "deny");
    const allowed = JSON.parse(hook({ hook_event_name: "beforeShellExecution", command: "pnpm test" }).out);
    assert.equal(allowed.permission, "allow");
  });
});
