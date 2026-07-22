# UniHER Harness And Loop Engineering Research

Date: 2026-07-22
Scope: authenticated UniHER internal-platform redesign orchestration.
Status: research artifact, not yet promoted into the canonical spec framework.

## Executive recommendation

Adopt harness engineering and loop engineering as a candidate operating framework for the next UniHER redesign wave, but do not rewrite every spec yet.

The strongest pattern across papers, official docs and community practice is:

1. Treat the repository docs, ledger, prompts, tools, tests, screenshots, write allowlists and promotion gates as the harness.
2. Treat each worker's bounded iteration as a loop with explicit observe, plan, act, verify, reflect and stop conditions.
3. Make every loop produce receipts and evidence that the coordinator can independently audit.
4. Promote the framework only if a pilot wave reduces drift and review toil without weakening privacy, visual QA or route containment.

For UniHER, this means the existing coordinator-led plan is directionally correct, but it needs a stricter harness schema and a loop contract that every worker session must follow.

## Source And Paper Dump

### Primary papers and benchmark frameworks

- ReAct, "Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022): establishes the reason/action/observation loop for tool-using agents. Useful for defining the inner worker loop. Source: https://arxiv.org/abs/2210.03629
- Reflexion, "Language Agents with Verbal Reinforcement Learning" (Shinn et al., 2023): agents reflect on feedback and store reflective text in episodic memory for later trials. Useful for post-wave lessons and worker receipts. Source: https://arxiv.org/abs/2303.11366
- Self-Refine, "Iterative Refinement with Self-Feedback" (Madaan et al., 2023): generator, feedback provider and refiner can be the same model without additional training. Useful for constrained local refinement before requesting promotion. Source: https://arxiv.org/abs/2303.17651
- SWE-agent, "Agent-Computer Interfaces Enable Automated Software Engineering" (Yang et al., 2024): interface design materially changes coding-agent performance; agents need purpose-built interfaces to edit, navigate and test repos. Useful for improving worker prompts, allowed commands and repo entrypoints. Source: https://arxiv.org/abs/2405.15793
- AgentDojo, "A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents" (Debenedetti et al., NeurIPS 2024): evaluation should be extensible and include realistic tasks, defenses and attacks rather than a static checklist. Useful for privacy/security gates around Semaforo, Liga and untrusted external content. Source: https://proceedings.neurips.cc/paper_files/paper/2024/hash/97091a5177d8dc64b1da8bf3e1f6fb54-Abstract-Datasets_and_Benchmarks_Track.html
- Agent Harness Engineering: A Survey (2026): proposes the ETCLOVG taxonomy: Execution, Tooling, Context, Lifecycle, Observability, Verification and Governance. Useful as the main checklist for UniHER harness completeness. Source: https://picrew.github.io/LLM-Harness/
- Agent Systems with Harness Engineering (Tang et al., 2026): curated roadmap for harness design, benchmarks and future directions. Useful as a literature index rather than a direct implementation spec. Source: https://github.com/RUCAIBox/awesome-agent-harness

### Official and engineering practice sources

- OpenAI, "Harness engineering: leveraging Codex in an agent-first world" (2026): repository knowledge should be the system of record; `AGENTS.md` is a map, active plans and decision logs are versioned. Source: https://openai.com/index/harness-engineering/
- Anthropic, "Effective harnesses for long-running agents" (2026): long-running work needs an initializer/progress artifact and each session must make incremental progress while leaving a clean state. Source: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- LangChain, "Improving Deep Agents with harness engineering" (2026): harness knobs include system prompts, tools, middleware, skills, delegation and memory; trace analysis and self-verification improved benchmark performance with the model held fixed. Source: https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering
- Inspect AI docs (UK AI Security Institute): repeatable evals are composed from datasets, solvers and scorers; agent evals run in sandboxes with message limits, retries and logs. Source: https://inspect.aisi.org.uk/
- GitHub Spec Kit docs: spec-driven development can be treated as an extensible, intent-driven harness with `Spec -> Plan -> Tasks -> Implement`, quality checklists and cross-artifact analysis. Source: https://github.github.com/spec-kit/
- GitHub Spec Kit repository: specs become executable artifacts instead of disposable scaffolding. Source: https://github.com/github/spec-kit
- GitHub Copilot agent docs: repo instructions, path-specific instructions, custom agents, MCP and preinstalled setup steps improve agent ability to build/test/validate in its environment. Source: https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks
- Addy Osmani, "How to write a good spec for AI agents" (2026): effective specs include commands, testing, project structure, code style, git workflow and boundaries; plan mode/spec-first prevents jumping to code before ambiguity is resolved. Source: https://addyosmani.com/blog/good-spec/

## Working Definitions For UniHER

Harness engineering:

The design of everything around the model that converts intent into auditable work: repository docs, routing, prompts, write allowlists, deny lists, tools, test commands, browser evidence, screenshots, ledger state, receipts, review gates, permissions and stop conditions.

Loop engineering:

The design of the repeated behavioral cycle inside each worker session: observe the real state, plan a small change, act within a bounded write set, verify with deterministic and visual checks, reflect into a receipt, then stop, retry or escalate.

The two are not competing concepts. Harness defines the operating system. Loop defines how each session moves inside it.

## What The Community Is Converging On

1. Specs are becoming executable control artifacts, not static documentation.
2. Successful teams separate broad intent, technical plan, task list and implementation receipts.
3. Long-running work needs explicit progress ledgers because new sessions lose conversational memory.
4. Good agent work depends heavily on interface design: allowed tools, repo maps, commands, validation scripts and file conventions.
5. Verification is moving left: build/test/screenshot/review gates happen before human review, not after a large unbounded diff.
6. Independent validation matters. The executor should not self-promote the same work it produced.
7. Harnesses should be evaluated like software: trace failures, change one knob at a time, avoid overfitting, keep regression evidence.
8. Security and governance are first-class layers, especially when agents can call tools or consume untrusted data.

## Mapping To The Current UniHER Plan

| Research concept | UniHER equivalent | Current state | Required upgrade |
| --- | --- | --- | --- |
| Execution environment | canonical checkout, worktree, local Next runtime, Playwright/browser evidence | present | add explicit per-lane runtime preflight |
| Tooling/protocol | Powershell, git, npm, Playwright, screenshots, Codex threads | present | define allowed commands per lane |
| Context/memory | roadmap, decision packet, audit docs, ledger, prompt template | present | add source priority and stale-doc handling |
| Lifecycle/orchestration | coordinator plus bounded workers | present | add loop states and stop conditions |
| Observability | git diff, screenshots, command results, receipts | partial | add required trace/receipt fields and failure taxonomy |
| Verification/evaluation | unit tests, typecheck, build, screenshots, independent review | present | define PASS/FAIL/BLOCKED scorecard schema per route |
| Governance/security | privacy gates, write denylist, Semaforo/Liga blockers | present | map each blocked area to explicit approval owner/gate |

## Candidate UniHER Harness Schema

Every future spec should include this section when the pilot passes:

```markdown
## Harness Contract

**Intent source:** <roadmap/spec/decision packet>
**Coordinator:** <session or role>
**Worker lane:** <single bounded lane>
**Write allowlist:** <exact files/directories>
**Write denylist:** <never touch list>
**Runtime preflight:** <git status, branch, env, server, auth state>
**Context pack:** <ordered docs/files to read>
**Allowed tools/commands:** <commands with expected output>
**Evidence outputs:** <screenshots, logs, receipts, scorecard paths>
**Verification gates:** <tests/build/typecheck/browser/privacy/role gates>
**Governance gates:** <clinical, legal, DPO, product, tenant/privacy gates>
**Stop conditions:** PASS, FAIL, BLOCKED, ESCALATE, HOLD
```

## Candidate UniHER Loop Contract

Each worker session should execute one lane using this loop:

```text
0. Preflight
   - confirm branch, HEAD, dirty files and assigned write set
   - refuse unrelated writes

1. Observe
   - read canonical docs and assigned source files
   - inspect current route/state/runtime truth

2. Plan
   - define the smallest change
   - name validators and screenshots before editing

3. Act
   - edit only allowlisted files
   - preserve existing redesign and user work

4. Verify
   - run lane-specific deterministic checks
   - capture desktop/mobile screenshots for visual routes
   - check privacy, role and containment constraints

5. Reflect
   - write receipt: files read, files changed, commands, evidence, risks, gaps
   - classify result as PASS, FAIL, BLOCKED or HOLD

6. Coordinator gate
   - coordinator reviews diff and evidence independently
   - only coordinator updates ledger/promotion status
```

## Pilot Proposal

Pilot lane: `visual-contained-pages`.

Why this lane:

- It already has five route surfaces and screenshots.
- It is user-facing enough to test visual evidence gates.
- It is contained enough to avoid schema/API/clinical/legal risk.
- It can prove whether harness+loop structure reduces drift without blocking delivery.

Pilot success criteria:

- All changed files match the lane allowlist.
- Worker receipt is complete.
- `git diff --check`, focused privacy tests, typecheck and build pass.
- Desktop/mobile screenshots exist for `/semaforo`, `/objetivos`, `/desafios`, `/conquistas` and `/liga`.
- Independent QA produces a scorecard with no unresolved P0/P1/P2.
- Ledger records PASS/HOLD/BLOCKED with exact evidence.
- No public landing, metadata, email, NR-1/Yavix architecture or unrelated docs are touched.

Pilot failure criteria:

- The process adds more ceremony without catching any new issue.
- Workers duplicate or contradict the coordinator ledger.
- Visual approval is claimed without screenshots.
- Any blocked surface appears activated in product copy.
- Any agent modifies outside its allowlist.

## Recommended Integration If Pilot Passes

1. Add `Harness Contract` and `Loop Contract` to the global UniHER orchestration spec.
2. Update the worker prompt template so every lane includes a harness block and loop receipt.
3. Add a route scorecard template under `docs/superpowers/audits/`.
4. Add `ETCLOVG coverage` to every wave closeout.
5. Add one coordinator-owned "harness change log" so prompt/tool/check changes are evaluated like code changes.

## Risks And Constraints

- Harness engineering is still an emerging term. Papers and blogs use overlapping labels such as scaffold, runtime, eval harness, agent loop and orchestration.
- Overfitting the process to one successful wave is a real risk. The first rollout should treat the framework as a pilot, not doctrine.
- More process can slow delivery if it is not bounded. For UniHER, harness fields should be compact and lane-specific.
- Human approval remains mandatory for clinical/privacy/legal/product gates; no loop should convert a blocked decision into implementation permission.

## Bottom Line

UniHER should adopt harness+loop engineering as a disciplined operating layer, not as a buzzword. The practical framework is:

- harness = repo control plane;
- loop = worker execution cycle;
- ledger = memory and audit trail;
- receipts = observability;
- screenshots/tests/build = verification;
- coordinator gate = governance.

Promote it after one successful pilot wave, then retrofit the same contract into all future UniHER specs.
