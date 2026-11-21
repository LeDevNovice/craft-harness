import { describe, expect, it } from "vitest";

import { projectName } from "./index.ts";

describe("harness smoke test", () => {
  it("runs the test suite inside pnpm check", () => {
    expect(projectName).toBeTypeOf("string");
  });
});
