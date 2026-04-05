---
status: current
module: workflow
category: other
created: 2026-04-04
updated: 2026-04-04
last-synced: 2026-04-04
completeness: 95
---

# Agent Workflow Guide

Read this at the start of every session. It explains how development work is tracked, how the spec and GitHub issues stay in sync, and what you are expected to do when those two sources of truth diverge.

## Table of Contents

- [Overview](#overview)
- [Current State](#current-state)
- [Rationale](#rationale)
- [Two Environments](#two-environments)
- [GitHub Issue Structure](#github-issue-structure)
- [Project Board Fields](#project-board-fields)
- [Session Workflow](#session-workflow)
- [Milestones](#milestones)
- [Keeping Spec and Issues Aligned](#keeping-spec-and-issues-aligned)
- [Coverage Targets](#coverage-targets)
- [GitHub Operations Quick Reference](#github-operations-quick-reference)

## Overview

soda3js is a modern TypeScript toolkit for the Socrata SODA3 Open Data API. It is organized as a pnpm monorepo with seven packages under `packages/`.

The authoritative design document lives at:

```text
docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md
```

This spec is a living document -- it is expected to change as implementation reveals new constraints or better approaches. Your job is to keep the spec, the GitHub issues, and the actual code in agreement with each other.

## Current State

Phase 1 (soql) is complete. Phase 2 is in progress: building `@soda3js/protocol` (wire-format types), `@soda3js/client` (Effect service library), and `@soda3js/rest` (batteries-included REST client).

Active epic: #3 (`@soda3js/client: Phase 2`). Milestone: v0.0.2. Iteration 2, P1.

Client tasks (#15-22) cover the core Effect library. New issues are needed for the `protocol` and `rest` packages.

## Rationale

The workflow exists to keep three sources of truth aligned: the spec, the GitHub issues, and the code. When they diverge, you are responsible for noticing and resolving the divergence, not just picking one source and ignoring the others. The spec is authoritative for architecture; issue bodies may have more recent tactical detail.

## Two Environments

This project has two active Claude environments:

| Environment | Responsibilities |
| --- | --- |
| Claude Desktop (management) | Create/triage issues, manage project board, architecture planning, review PRs, update spec structure |
| Claude Code (you) | Implement features, write tests, update spec when code diverges, mark issues In Progress / Done |

You have GitHub MCP access via the `github-soda3js` extension. Use it. You are expected to interact with GitHub issues as part of normal development.

Only `github-soda3js:projects_write` can write to the soda3js org project board. The `github-spencerbeggs:projects_write` extension returns 404 for org project writes.

## GitHub Issue Structure

The work is organized in two tiers on the public project board at `https://github.com/orgs/soda3js/projects/1`.

### Epics (type = "Epic")

| Issue | Title | Phase | Milestone |
| --- | --- | --- | --- |
| #2 | `@soda3js/soql: Phase 1` | Phase 1 | v0.0.1 |
| #3 | `@soda3js/client: Phase 2` | Phase 2 | v0.0.2 |
| #6 | `@soda3js/server: Phase 3` | Phase 3 | -- |
| #7 | `@soda3js/cli: Phase 4` | Phase 4 | v0.1.0 |
| #8 | `Release hardening: Phase 5` | Phase 5 | v0.1.0 |

Epics are never closed by you directly. They close automatically when all sub-issues are closed, or are closed by the management environment.

### Tasks (type = "Task")

Sub-issues grouped under their parent epic. Each Task represents a concrete, shippable unit of implementation work.

Phase 1 soql tasks (#9-14): All closed (Phase 1 complete).

Phase 2 client tasks (#15-22): Active, Iteration 2, P1, milestone v0.0.2.

Phase 2 protocol and rest tasks: To be created.

## Project Board Fields

Field IDs and option values (owner: `soda3js`, org, project #1):

```text
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
  Iteration 1 (Apr 3-16):  76d73569
  Iteration 2 (Apr 17-30): c4902ca4
  Iteration 3 (May 1-14):  2c76b619
```

Use `github-soda3js:projects_write` with `method: update_project_item` to update these fields.

## Session Workflow

### At the start of every session

1. Read the current phase's epic issue to understand scope.
2. Check which tasks are `In Progress` on the project board.
3. Read the spec section corresponding to the task you are implementing.
4. Check if any task issue body has notes that contradict the spec. The issue body is more recent for tactical detail; the spec is authoritative for architecture.

### When you start work on a task

- Confirm the task's Status is `In Progress`. If you pick up a `Todo` task, update it to `In Progress` first.
- Read the full task body -- it specifies the file to create, what it must implement, and any constraints.

### When you finish a task

1. All tests pass: `pnpm test --filter @soda3js/<package>`.
2. Close the issue via commit footer (`closes #N`), not manually via the API.
3. Update Status to `Done` on the project board (`github-soda3js:projects_write`).
4. If the implementation diverged from the spec, update the spec immediately.

### When you finish all tasks for an epic

- Post a comment on the epic summarizing what was built, any spec changes made, and any deferred items.
- Do not close the epic -- the management environment does that.

## Milestones

| Milestone | Number | Scope |
| --- | --- | --- |
| v0.0.1 | 1 | `@soda3js/soql` |
| v0.0.2 | 2 | `@soda3js/protocol` + `@soda3js/client` + `@soda3js/rest` |
| v1.0.0 | 3 | Reserved |
| v0.1.0 | 4 | Full release (cli + hardening) |

## Keeping Spec and Issues Aligned

**Case A: Spec says X but implementation requires Y**
Implement Y. Update the spec. Post a comment on the task issue explaining the change.

**Case B: Spec is silent on a decision**
Decide. Document in spec. Post: "Spec was silent on X. Decision: Y. Rationale: [reason]. Spec updated."

**Case C: Task needs more work than its body describes**
Complete the task as written. Create a new Task issue for the gap. Comment on the original.

**Case D: TDD build order needs to change**
Re-order. Update the spec's build order section. Note it on the epic.

## Coverage Targets

Phase 1 soql: strict -- 80% statements / 75% branches / 80% functions / 80% lines.
Phase 2 client: standard coverage level.

## GitHub Operations Quick Reference

```bash
# Read a task
github-soda3js:issue_read  owner:soda3js  repo:tools  issue_number:15  method:get

# Mark In Progress
github-soda3js:projects_write  method:update_project_item  owner:soda3js  owner_type:org
  project_number:1  item_id:<ITEM_ID>  updated_field:{id:272063678, value:"47fc9ee4"}

# Close a task when done (prefer commit footer: closes #N)
github-soda3js:issue_write  method:update  owner:soda3js  repo:tools
  issue_number:15  state:closed  state_reason:completed

# Mark Done on the board
github-soda3js:projects_write  method:update_project_item  owner:soda3js  owner_type:org
  project_number:1  item_id:<ITEM_ID>  updated_field:{id:272063678, value:"98236657"}

# Add a spec-change comment on a task
github-soda3js:add_issue_comment  owner:soda3js  repo:tools  issue_number:15
  body:"Spec updated: [what changed and why]"

# Create a new task
github-soda3js:issue_write  method:create  owner:soda3js  repo:tools
  title:"@soda3js/client: [description]"  type:Task  milestone:2
```

The spec is not a cage. If it's wrong, fix it. If it's silent, decide and document. The goal is working software with a spec that accurately describes what was built.
