# Technical specification

> Written by the human. The agent reads section 1 for every open choice (skill `decide`).

## 1. Quality attributes

### 1.1 Ranked (a higher one wins over any number of lower ones)
1. Functional correctness
2. …
3. Maintainability
4. Reversibility

### 1.2 Hard constraints (never traded)
- Budgets: …
- Jurisdiction, licences, cost ceiling: …

## 2. Architecture
Modules or contexts, their responsibilities, the dependency direction between them, and the rules
per layer. Area rules for the agent go into the nearest `AGENTS.md`.

## 3. Stack
Each choice with its ADR.

## 4. Data and interfaces
Schemas, contracts, error format, versioning policy.

## 5. Testing strategy
Levels, tools, what runs on each commit, what runs nightly.

## 6. Operations
Deployment, observability, backups, security, privacy.

## 7. Deliberately absent
Each thing not built, and the condition that would make it worth adding.
