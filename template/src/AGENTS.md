# AGENTS.md — src

TypeScript, strict (`tsconfig.base.json`), ES modules. Spec: `docs/specs/technical.md` §2–§5.

## Layout (adapt it in an ADR before the first module)

`src/modules/<context>/{domain,application,infrastructure,interface}/` + `index.ts`, the only
import point for other modules. `src/shared-kernel/` holds branded ids and value types used across
contexts. Boundaries are enforced by `.dependency-cruiser.cjs`.

| Layer | May import | Must not |
| --- | --- | --- |
| `domain/` | itself, `src/shared-kernel` | IO, clock, randomness, frameworks. Pass `now` as a parameter |
| `application/` | `domain/`, ports it declares | Concrete adapters, transport types |
| `infrastructure/` | anything, to implement ports | Business rules |
| `interface/` | application use cases | Logic beyond decode → use case → encode |

## Conventions

- Errors are values with a tag, part of the function's type; exceptions only for defects.
- No `any`; `unknown` is narrowed at the boundary where data enters.
- Tests next to the code (`*.test.ts`), titles start with the requirement id they prove.
- Before using a library API, read its installed types under `node_modules/<pkg>`.
