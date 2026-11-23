# State of the art — what the research says, and what the template does about it

Snapshot of November 2026. Each section states a finding, its sources, and the consequence in the
template. When the evidence changes, the consequence should change too (`docs/adr/`, and the
assumptions register shipped in every project).

## 1. Instructions guide; gates decide

**Finding.** Context files are guidance, not enforcement. Harness vendors say so themselves: Claude
Code's documentation contrasts advisory `CLAUDE.md` instructions with hooks, which are deterministic
and guarantee the action happens; the Agentic AI Foundation's own measurement of `AGENTS.md`
concludes that enforcement belongs in CI, branch protection and sandboxing. Agents read the
instructions and mostly follow them — but "mostly" is not a property a codebase can rest on.

**Consequence.** Two layers with different jobs. `AGENTS.md` and skills tell the agent what to do.
Git hooks, zero-dependency harness scripts and CI refuse what must never happen, whatever the
harness, the model or the prompt: out-of-order work, unplanned commit messages, deleted or skipped
tests, uncovered requirements, edits to human-owned files, weakened thresholds.

Sources: [Claude Code best practices](https://code.claude.com/docs/en/best-practices.md) ·
[Measuring AGENTS.md (AAIF, 2026)](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)

## 2. Context files: short, concrete, a map rather than an encyclopedia

**Finding.** A 2026 ETH Zurich study (ICLR 2026 workshop) found that repository context files,
whether LLM-generated or developer-written, did not raise task success on average and increased
inference cost by over 20 %: agents explore and test more without getting more correct. The AAIF
measurement found the opposite effect for a short, concrete file (twelve lines: commands, paths,
"don't edit X") — less wall time, smaller diffs, fewer wasted runs. OpenAI's harness-engineering
report describes the same lesson at scale: one big `AGENTS.md` failed; a ~100-line `AGENTS.md` used
as a table of contents into a structured `docs/` folder worked. Claude Code's guidance is the same:
for each line, ask whether removing it would cause a mistake.

**Consequence.** Root `AGENTS.md` ≈ 100 lines: the session start, where the sources of truth are and
which one wins, the loop, the commit format, the thinking discipline, boundaries, stop conditions,
commands. Everything else is a skill loaded on demand or a nested `AGENTS.md` next to the code it
governs. The specs are read only when a plan line cites them.

Sources: [Gloaguen et al., *Evaluating AGENTS.md*, arXiv:2602.11988](https://arxiv.org/abs/2602.11988) ·
[OpenAI, *Harness engineering*](https://openai.com/index/harness-engineering/) ·
[AAIF measurement](https://aaif.io/blog/measuring-agents-md-what-five-runs-show-that-one-doesn-t)

## 3. Open standards for portability

**Finding.** `AGENTS.md` is stewarded by the Agentic AI Foundation (Linux Foundation) and read
natively by Codex, Cursor, GitHub Copilot, DeepSeek Harness and dozens more; Claude Code reads it
when no `CLAUDE.md` exists (since v2.1.277) and has always supported importing it from `CLAUDE.md`.
Agent Skills (`SKILL.md`, agentskills.io) was donated to the same foundation and is integrated by
more than 70 platforms; `.agents/skills/` is the shared project location read by Codex, DeepSeek
Harness, Cursor and Copilot, while Claude Code reads `.claude/skills/` (symlinks are followed).

**Consequence.** One source of truth per concept: `AGENTS.md` and `.agents/skills/`. Adapters are
thin: `CLAUDE.md` imports `AGENTS.md` (works on every version and leaves room for Claude-specific
notes), `.claude/skills` is a symlink. Skills use only the standard frontmatter (`name` = directory,
`description` saying what and when).

Sources: [AAIF launch](https://openai.com/index/agentic-ai-foundation/) ·
[Agent Skills donated to AAIF](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation) ·
[Agent Skills specification](https://agentskills.io/specification) ·
[Codex skills](https://developers.openai.com/codex/skills)

## 4. Externalized state and one unit of work per fresh context

**Finding.** Long-running agents work in discrete sessions that start with no memory. Anthropic's
harness work made progress across context windows with persistent artifacts: a JSON feature list
(JSON because models are less inclined to rewrite it than Markdown) where the agent only flips a
status, a progress file, git history, a startup routine (where am I, what was done, what is next,
does it still work), and one feature per session. Claude Code's guidance adds: performance
degrades as the context fills; clear it between tasks.

**Consequence.** `docs/plan/plan.json` (the agent edits `status` and `notes` only, checked by
script), one progress note per line, `status.mjs` run at session start (and injected by the
adapters), one plan line per session, a fresh context for the next.

Sources: [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## 5. The generator should not grade itself

**Finding.** Anthropic's harness-design work found that a model asked to evaluate its own work
praises it, while a standalone evaluator is far easier to tune toward skepticism; out of the box
Claude found real issues and then talked itself into approving them. Cognition reports its best
review results when the reviewing agent shares no context with the coding agent. Claude Code's
guidance adds the counterweight: a reviewer prompted to find gaps always finds some, and chasing
them all produces over-engineering — limit findings to correctness and stated requirements. The
older result behind all this: without external feedback, LLMs do not reliably self-correct.

**Consequence.** Skill `review-change`: a reviewer with no access to the implementer's session,
fed only by `review-prompt.mjs` (diff, plan line, exact requirement text), five finding categories,
a failing case required for each finding, verdict `PASS`/`BLOCK`. It runs as a subagent
(`.claude/agents/reviewer.md`) or headless in any harness (`… | claude -p`, `… | codex exec -`).

Sources: [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) ·
[Cognition, *Multi-agents: what's actually working*](https://cognition.com/blog/multi-agents-working) ·
[Huang et al., *LLMs cannot self-correct reasoning yet*](https://arxiv.org/abs/2310.01798)

## 6. Agents game tests

**Finding.** ImpossibleBench (ICLR 2026) gives agents tasks whose tests contradict the
specification: frontier models often pass by modifying tests, special-casing inputs or overloading
operators. Hiding tests helps but hurts legitimate work; an explicit instruction to stop on a
conflict helps. Later benchmarks (EvilGenie) observe reward hacking even on solvable tasks.

**Consequence.** Three defences. The pre-commit guard refuses deleted, focused or skipped tests,
removed requirement ids and weakened thresholds. `AGENTS.md` and `implement-line` make a test that
contradicts a requirement a stop condition, and call bending a test a failure. The reviewer's first
category includes tests that assert copied values or special-case inputs.

Sources: [ImpossibleBench, arXiv:2510.20270](https://arxiv.org/abs/2510.20270) ·
[EvilGenie, arXiv:2511.21654](https://arxiv.org/abs/2511.21654)

## 7. Multi-agent: parallel reads, single-threaded writes

**Finding.** Cognition argued in 2025 against multi-agent systems because parallel writers make
conflicting implicit decisions; its 2026 follow-up keeps that rule ("writes stay single-threaded")
while endorsing clean-context review loops, manager–children delegation and read-only parallel
search. Anthropic's multi-agent research system shows large gains on breadth-first research, and
notes that coding is far less parallelizable. Practitioner guidance converges: parallelize only
independent modules, each against a written specification; isolate with git worktrees.

**Consequence.** Sequential by default. Parallel lanes are opt-in per plan line: `dependsOn` and
`touches` declared by the human, disjointness checked by script, one worktree and one writer per
lane, integration one lane at a time with every gate re-run on the merged tree (`lanes.mjs`).
Read-only helpers (search, documentation, review) may always run in parallel.

Sources: [Cognition, *Don't build multi-agents*](https://cognition.com/blog/dont-build-multi-agents) ·
[Cognition 2026 follow-up](https://cognition.com/blog/multi-agents-working) ·
[Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

## 8. Every harness component is an assumption that expires

**Finding.** Anthropic stripped components from its own harness as models improved (sprints,
context resets, per-sprint evaluation), one at a time — a radical cut failed and hid which parts
were load-bearing. Its principle: each component encodes an assumption about what the model cannot
do alone; re-examine them when a new model arrives.

**Consequence.** Every generated project carries `docs/harness/assumptions.md` (component,
assumption, signal, experiment to drop it) and skill `audit-harness`, which classifies components
on evidence from the repository and proposes one change at a time. The template itself is
updatable (section 10), so a simplification reaches existing projects.

Source: [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

## 9. Security: the lethal trifecta is the default for coding agents

**Finding.** A coding agent has private data, reads untrusted content and can communicate — Simon
Willison's "lethal trifecta" — so a prompt injection can become exfiltration or a malicious change.
Skills, plugins and MCP tool descriptions are prompts too. Sandboxes ship opt-in; hooks and MCP
initialization can run outside them.

**Consequence.** Human-owned rules that injected text cannot rewrite (agent hook before the edit,
guard after, CODEOWNERS on the server), a review context that never read the untrusted content,
`AGENTS.md` treating external text as data, secrets and deploys as human actions, and
`docs/harness/security.md` listing what to add: sandbox, least-privilege tokens, branch
protection, vetting of skills and MCP servers.

Sources: [Willison, *The lethal trifecta*](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) ·
[NVIDIA AI Red Team, sandboxing agentic workflows](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk)

## 10. A template that keeps up: Copier

**Finding.** Cookiecutter and GitHub template repositories generate once; Copier records the
answers and template version and applies later template versions with a three-way merge that
keeps local changes.

**Consequence.** The template is a Copier template. `copier update` brings harness improvements
(and harness simplifications, section 8) into existing projects.

Sources: [Copier — comparisons](https://copier.readthedocs.io/en/stable/comparisons/) ·
[Copier — updating a project](https://copier.readthedocs.io/en/stable/updating/)

## 11. Software craftsmanship, unchanged and more necessary

| Practice | What it says | Where it lives |
| --- | --- | --- |
| Canon TDD (Kent Beck) | Test list → one test → pass → refactor → repeat; do not turn the whole list into tests at once; do not mix refactoring and passing | `implement-line` §3 |
| Tidy First (Kent Beck) | Separate structure and behaviour changes into different commits | `Plan: <id>a` refactor commits, checked by `commit-msg` |
| Walking skeleton, vertical slices | Prove the whole chain before business rules, then deliver usable slices | `plan-from-spec` |
| Conventional Commits | `type(scope): description` | `commit-msg`, planned messages |
| Architecture decision records (MADR) | Short, immutable, superseded rather than rewritten | `docs/adr/`, `decide` |
| Ubiquitous language (DDD) | One term, one name in code | `CONTEXT.md` |
| Fitness functions | Architecture rules checked by tools | dependency-cruiser in the TypeScript profile |
| Mutation testing | Surviving mutants are missing tests | `test-requirements` |
| Proportionality (YAGNI) | Build what the current line needs; write down what is absent and when to add it | `decide` §6, `absent.md` in plan proposals |
| Spec-driven development | Specs before code; plans of small verifiable tasks | `docs/specs/`, `draft-specs`, `plan-from-spec`, `plan.json` |

Sources: [Canon TDD](https://newsletter.kentbeck.com/p/canon-tdd) ·
[Conventional Commits](https://www.conventionalcommits.org/) · [MADR](https://adr.github.io/madr/) ·
[Böckeler, *Understanding spec-driven development*](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) ·
[Osmani, *How to write a good spec for AI agents*](https://addyosmani.com/blog/good-spec/)

## 12. Specifications: the agent drafts from sources, the human decides

**Finding.** Studies of LLM-written requirements find usable drafts whose completeness and
precision track the quality of the input, and which still need human revision; ambiguous and
unfeasible requirements are the recurring defect. Spec-driven tools converge on the same answers:
requirements in EARS patterns (Kiro), a few clarification questions ranked by impact and asked one
at a time before planning (Spec Kit), and short specs, because reviewing long generated Markdown is
where the time goes (Böckeler). For skills themselves, SkillsBench measured that curated skills
raise success rates while self-generated ones do not help, and that focused skills beat
comprehensive documentation; Anthropic's authoring guidance says the same (concise, a checklist,
a validate-fix loop, evaluation before documentation).

**Consequence.** Skill `draft-specs`, written as short as the other skills: specs drafted only from
the human's material, as a proposal in `docs/plan/proposals/`; every statement cites a source or is
marked proposed and listed in `questions.md`; requirements in EARS patterns with a given/when/then
case each; stack choices as Proposed ADRs; a check-fix loop, then a fresh-context reviewer when the
harness can run one. Framing the idea itself stays outside the template (ADR-0014).

Sources: [Exploring LLMs for requirements specification in an IT consulting company](https://arxiv.org/abs/2507.19113) ·
[Kiro, feature specs](https://kiro.dev/docs/specs/feature-specs/) ·
[EARS](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) ·
[Spec Kit, `clarify`](https://github.com/github/spec-kit/blob/main/templates/commands/clarify.md) ·
[Böckeler, *Understanding spec-driven development*](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) ·
[SkillsBench](https://arxiv.org/abs/2602.12670) ·
[Anthropic, skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
