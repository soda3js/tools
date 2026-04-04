# soda3js — Claude Code Agent Workflow Guide

> Read this at the start of every session. It explains how development work is tracked, how the spec and GitHub issues stay in sync, and what you are expected to do when those two sources of truth diverge.

---

## 1. What This Project Is

**soda3js** is a modern TypeScript toolkit for the Socrata SODA3 Open Data API — the first JS/TS client to support SODA3. It is organized as a pnpm monorepo with five packages under `packages/`.

The authoritative design document lives at:

```
docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md
```

This spec is a **living document** — it is expected to change as implementation reveals new constraints or better approaches. That is fine and expected. Your job is to keep the spec, the GitHub issues, and the actual code in agreement with each other. When they diverge, you are responsible for noticing and resolving the divergence, not just picking one source and ignoring the others.

---

## 2. Two Environments, One Project

This project has two active Claude environments:

| Environment | Responsibilities |
|---|---|
| **Claude Desktop** (management) | Create/triage issues, manage project board, architecture planning, review PRs, update spec structure |
| **Claude Code** (you) | Implement features, write tests, update spec when code diverges, mark issues In Progress / Done |

You have GitHub MCP access via the `github-soda3js` extension. Use it. You are expected to interact with GitHub issues as part of normal development — not as an afterthought.

**Critical:** Only `github-soda3js:projects_write` can write to the soda3js org project board. The `github-spencerbeggs:projects_write` extension returns 404 for org project writes — do not use it for board field updates.

---

## 3. GitHub Issue Structure

The work is organized in two tiers on the public project board at `https://github.com/orgs/soda3js/projects/1`.

### Tier 1: Epics (type = "Epic")

Six epics, one per development phase:

| Issue | Title | Phase | Milestone |
|---|---|---|---|
| #2 | `@soda3js/soql: Phase 1` | Phase 1 | v0.0.1 |
| #3 | `@soda3js/client: Phase 2` | Phase 2 | v0.0.2 |
| #5 | `@soda3js/api: Phase 3` | Phase 3 | — |
| #6 | `@soda3js/server: Phase 3` | Phase 3 | — |
| #7 | `@soda3js/cli: Phase 4` | Phase 4 | v0.1.0 |
| #8 | `Release hardening: Phase 5` | Phase 5 | v0.1.0 |

Epics are never closed by you directly. They close automatically when all sub-issues are closed, or are closed by the management environment at phase completion.

### Tier 2: Tasks (type = "Task")

35 sub-issues grouped under their parent epic. Each Task represents a concrete, shippable unit of implementation work — typically one module or one test file.

**soql tasks** — In Progress, Iteration 1, P0, milestone v0.0.1:

| # | Title | Item ID |
|---|---|---|
| 9 | AST expression node types — `expressions.ts` | 172355761 |
| 10 | Compiler — `toParams()` and `toBody()` — `compiler.ts` | 172355774 |
| 11 | Tier 1 SoQL function constructors — `functions.ts` | 172355788 |
| 12 | SoQL clause types — `clauses.ts` | 172355794 |
| 13 | Fluent immutable builder API — `builder.ts` | 172355800 |
| 14 | AST shape stability contract tests — `ast-contract.test.ts` | 172355805 |

**client tasks (#15–22)** — Todo, Iteration 2, P1, milestone v0.0.2.

**api (#23–27)**, **server (#28–31)**, **cli (#32–38)**, **release (#39–43)** — Todo, Iteration 3, P1.

---

## 4. Project Board Fields

**Field IDs and option values** (owner: `soda3js`, org, project #1):

```
Status field:     272063678
  Todo:           f75ad846
  In Progress:    47fc9ee4
  Done:           98236657

Priority field:   272063842
  P0:             d6121695
  P1:             887544fb

Size field:       272063843
  XS:             be5885af
  S:              1d5fffa8
  M:              be603b4d
  L:              bd3a0519
  XL:             2ece676e

Iteration field:  272063845
  Iteration 1 (Apr 3–16):  76d73569
  Iteration 2 (Apr 17–30): c4902ca4
  Iteration 3 (May 1–14):  2c76b619
```

Use `github-soda3js:projects_write` with `method: update_project_item` to update these fields.

---

## 5. Your Session Workflow

### At the start of every session

1. Read the current phase's epic issue to understand scope.
2. Check which tasks are `In Progress` on the project board. The soql tasks (#9–14) are the current active work.
3. Read the spec section corresponding to the task you are implementing (§3 of the spec for soql).
4. Check if any task issue body has notes that contradict the spec. The issue body is more recent for tactical detail; the spec is authoritative for architecture.

### When you start work on a task

- Confirm the task's Status is `In Progress`. If you pick up a `Todo` task, update it to `In Progress` first.
- Read the full task body — it specifies the file to create, what it must implement, and any constraints.

### When you finish a task

1. All tests pass: `pnpm test --filter @soda3js/<package>`.
2. Close the issue: `github-soda3js:issue_write` with `state: closed`, `state_reason: completed`.
3. Update Status to `Done` on the project board (`github-soda3js:projects_write`).
4. If the implementation diverged from the spec, update the spec immediately.

### When you finish all tasks for an epic

- Post a comment on the epic summarizing what was built, any spec changes made, and any deferred items.
- Do **not** close the epic — the management environment does that.

---

## 6. Milestones

| Milestone | Number | Scope |
|---|---|---|
| `v0.0.1` | 1 | `@soda3js/soql` |
| `v0.0.2` | 2 | `@soda3js/client` |
| `v1.0.0` | 3 | Reserved |
| `v0.1.0` | 4 | Full release (cli + hardening) |

---

## 7. Keeping Spec and Issues Aligned

**Case A: Spec says X but implementation requires Y**
Implement Y. Update the spec. Post a comment on the task issue explaining the change.

**Case B: Spec is silent on a decision**
Decide. Document in spec. Post: `"Spec was silent on X. Decision: Y. Rationale: [reason]. Spec updated."`

**Case C: Task needs more work than its body describes**
Complete the task as written. Create a new Task issue for the gap. Comment on the original.

**Case D: TDD build order needs to change**
Re-order. Update the spec's build order section. Note it on the epic.

---

## 8. TDD Build Order for Phase 1 (Current Work)

```
1.  expressions.test.ts  →  expressions.ts   (AST node types)
2.  compiler.test.ts     →  compiler.ts      (AST → string, both formats)
3.  functions.test.ts    →  functions.ts     (Tier 1 function constructors)
4.  clauses.test.ts      →  clauses.ts       (clause types)
5.  builder.test.ts      →  builder.ts       (fluent API)
6.  ast-contract.test.ts                     (AST shape stability)
```

Write the test first. Run it. Watch it fail. Then implement until it passes.

---

## 9. Critical Architectural Facts

Verified against live Socrata APIs. Do not change without updating spec and noting it on the relevant issue.

- **SODA2** `GET /resource/{id}.json` — works without auth. `toParams()` is the primary compile target.
- **SODA3** `POST /api/v3/views/{id}/query.json` — hard 403 without app token. `toBody()` is the secondary target.
- **Metadata** `GET /api/views/{id}.json` — no v3 prefix, no auth.
- **Export** `GET /api/views/{id}/rows.{fmt}?accessType=DOWNLOAD` — no auth.
- No `Retry-After` header on 429 — use synthetic exponential backoff.
- No pagination headers — last page = empty JSON array `[]`.
- Error shape: `{ code, error: true, message, data? }`.
- Timestamps in metadata are Unix epoch integers (not ISO strings).
- No `rowCount` in metadata — use `SELECT count(*)`.
- String escaping: doubled single quotes (`'Bob''s'`), not backslashes.
- Booleans: `true`/`false` lowercase.
- Column names with spaces: backtick-quoted.
- `case_` not `case` — trailing underscore avoids JS reserved word collision.
- `DISTINCT` is a SELECT modifier (`selectDistinct()` builder method), not a function.
- AST types are **public** — exported from `@soda3js/soql` for `@soda3js/api`'s transpiler.

---

## 10. What "Done" Means for Each soql Task

**#9 — expressions.ts**
All six node types exported from `src/index.ts`: `Column`, `Literal`, `FunctionCall`, `BinaryOp`, `UnaryOp`, `Alias`. Each has a discriminant `type` field. `Literal` handles string/number/boolean/null. `Column` supports plain and backtick-quoted names.

**#10 — compiler.ts**
`compile(ast) → string` for both targets. `toParams()` produces URL-encoded `$select=...&$where=...`. `toBody()` produces `{ query: "SELECT ... WHERE ..." }`. String escaping, boolean casing, and backtick quoting all correct.

**#11 — functions.ts**
All Tier 1 constructors: comparison (15), boolean (3), aggregate (5), string (3: upper/lower/concat), arithmetic (4: add/sub/mul/div), full-text (1: q), other (1: case\_). Plus always-available: `alias`, `raw`, `column`. Each returns the correct AST node type.

**#12 — clauses.ts**
`Select`, `Where`, `OrderBy`, `GroupBy`, `Having`, `Limit`, `Offset` types. `Select` holds expressions and a `distinct` flag. Tests verify each clause round-trips through the compiler.

**#13 — builder.ts**
Immutable `SoQLBuilder` class — every method returns a new instance. `selectDistinct()` sets the distinct flag. Multiple `.where()` calls AND together. Tests verify immutability by branching a query and confirming the branches compile independently.

**#14 — ast-contract.test.ts**
Snapshot or explicit shape assertions on all 6 exported node types. Verifies discriminant fields are stable. These protect `@soda3js/api`'s transpiler from silent AST drift.

---

## 11. Coverage Targets

Phase 1 soql target: **strict** — 80% statements / 75% branches / 80% functions / 80% lines.

This is achievable for pure functions with deterministic I/O. There is no excuse for gaps.

---

## 12. Quick Reference — GitHub Operations

```
# Read a task
github-soda3js:issue_read  owner:soda3js  repo:tools  issue_number:9  method:get

# Mark In Progress (use item_id from the table in §3)
github-soda3js:projects_write  method:update_project_item  owner:soda3js  owner_type:org
  project_number:1  item_id:172355761  updated_field:{id:272063678, value:"47fc9ee4"}

# Close a task when done
github-soda3js:issue_write  method:update  owner:soda3js  repo:tools
  issue_number:9  state:closed  state_reason:completed

# Mark Done on the board
github-soda3js:projects_write  method:update_project_item  owner:soda3js  owner_type:org
  project_number:1  item_id:172355761  updated_field:{id:272063678, value:"98236657"}

# Add a spec-change comment on a task
github-soda3js:add_issue_comment  owner:soda3js  repo:tools  issue_number:9
  body:"Spec updated: [what changed and why]"

# Create a new task (if scope gap found)
github-soda3js:issue_write  method:create  owner:soda3js  repo:tools
  title:"@soda3js/soql: [description]"  type:Task  milestone:1
```

---

## 13. The Spec Is Not a Cage

The spec exists to give you enough architectural context to make good decisions without synchronous consultation. It is not a bureaucratic constraint. If the spec is wrong, fix it. If the spec is silent, decide and document. The goal is working software with a spec that accurately describes what was built.

When in doubt: implement the simplest thing that satisfies the task's acceptance criteria, update the spec to match, and note the decision in the issue.
