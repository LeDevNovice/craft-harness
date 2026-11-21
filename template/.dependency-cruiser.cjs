/** Architecture boundaries, checked by `pnpm depcruise` (part of `pnpm check`). Human-owned threshold file. */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-is-pure",
      comment: "domain/ code depends on nothing but itself and the shared kernel",
      severity: "error",
      from: { path: "(^|/)domain/" },
      to: { path: "(^|/)(application|infrastructure|interface)/" },
    },
    {
      name: "application-has-no-adapters",
      severity: "error",
      from: { path: "(^|/)application/" },
      to: { path: "(^|/)(infrastructure|interface)/" },
    },
    {
      name: "modules-through-their-index",
      comment: "another module is reached through its index.ts only",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/.+",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "not-to-test",
      severity: "error",
      from: { pathNot: "\\.(test|spec)\\.ts$" },
      to: { path: "\\.(test|spec)\\.ts$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // SWC parser: the TypeScript 7 compiler API is not usable by dependency-cruiser (it would cruise 0 modules).
    parser: "swc",
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "types", "default"] },
  },
};
