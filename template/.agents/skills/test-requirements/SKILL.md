---
name: test-requirements
description: How to write tests for numbered requirements so they stay traceable and honest — requirement id in the test title, expectations derived from the requirement text, domain builders, property tests for invariants, controlled time, no mocks of our own code, mutation testing as the judge of test strength. Use whenever a plan line cites a requirement id or changes domain logic.
---

# Testing requirements

- **Name**: the requirement id comes first in the test title (or in the test's docstring/marker for
  languages whose titles are identifiers), e.g. `"REQ-12 — a member can veto a title"`. One
  requirement may have several tests; every cited requirement has at least one.
  `scripts/harness/requirements-check.mjs` enforces it, and the pre-commit guard refuses removing one.
- **Source**: expected values come from the requirement text and the acceptance cases of
  `docs/specs/product.md`, never from running the code and copying its output.
- **Builders**: express test data in the domain vocabulary of `CONTEXT.md`
  (`aMember().withRole("owner").build()`), kept in a `testing/` folder next to the module.
- **Properties** for invariants over sequences or large input spaces (ordering, alternation,
  idempotency, round-trips, time-zone and calendar edges). Keep the failing seed in the output;
  never lower the number of runs to make a test pass.
- **Time**: domain functions take `now` as a parameter; application code reads a clock abstraction
  that tests control. Never the system clock directly.
- **No mocks of our own code**: in-memory implementations of ports, a real database in integration
  tests, recorded fixtures for third-party APIs.
- **Mutation testing**, when the profile provides it, judges test strength on domain code: a
  surviving mutant is a missing test, not a reason to lower the threshold.
- **A test that contradicts the requirement** is reported, never edited or worked around.
