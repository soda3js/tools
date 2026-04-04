# soda3js/tools

A modern TypeScript toolkit for the Socrata SODA3 Open Data API.

## Project Structure

Monorepo with five packages under `packages/`:

| Package | Purpose | Published |
| --- | --- | --- |
| `@soda3js/soql` | SoQL query builder (pure TS, zero deps) -- **Phase 1 complete** | Yes |
| `@soda3js/client` | SODA3 HTTP client (Effect-TS, conditional exports) | Yes |
| `@soda3js/cli` | Terminal client (`@effect/cli`, bin: `soda3`) | Yes |
| `@soda3js/api` | SODA3 server framework (Bun-native) | Eventually |
| `@soda3js/server` | Internal integration test harness (Bun-native) | No (private) |

Dependency graph: `soql` is the leaf. `client` depends on `soql`. `cli` depends on `client` + `soql`. `api` depends on `soql`. `server` depends on `api` + `client`.

## Toolchain

- **Package manager:** pnpm with workspaces
- **Build orchestration:** Turborepo
- **Linting/formatting:** Biome (extends `@savvy-web/lint-staged/biome/silk.jsonc`)
- **Testing:** `@savvy-web/vitest` for test discovery and coverage
- **Versioning:** `@savvy-web/changesets` with fixed versioning across `soql`, `client`, `cli`
- **Commits:** Husky + lint-staged + commitlint (DCO signoff required)
- **Builders:** `@savvy-web/rslib-builder` for all packages

## Build System (rslib-builder)

Source `package.json` files have `"private": true` intentionally. The
`@savvy-web/rslib-builder` transforms packages at build time based on
`publishConfig.access`:

- `private: true` becomes `private: false` in `dist/npm/package.json`
- `exports` are rewritten from `./src/*.ts` to `./index.js` + `./index.d.ts`
- `bin` entries are rewritten to point to built JS with shebang
- `devDependencies`, `publishConfig`, `scripts` are stripped by the `transform` callback
- `workspace:*` deps are resolved to concrete versions

Do not remove `private: true` from source package.json files or manually
edit export paths. The `dist/npm/package.json` is the published artifact.

## Conventions

- All published packages share a single version number (fixed group)
- `workspace:*` for internal dependencies
- Test directories: `__test__/` with suffixes `.test.ts` (unit), `.int.test.ts` (integration), `.e2e.test.ts` (e2e)
- Test utilities in `__test__/**/utils/` (linted, excluded from discovery)
- Shared fixtures in `__fixtures__/datasets/` at repo root
- Package-specific configs in `lib/configs/`, scripts in `lib/scripts/`
- `CaseWhen` uses `.result` (not `.then`) due to Biome `noThenProperty` lint rule
- Reserved-word functions use trailing underscore: `case_()`, `in_()` (re-exported as `inList`)
- Internal sentinel function names `__case` and `__list` in AST -- do not use directly

## Testing

- Root `vitest.config.ts` uses `@savvy-web/vitest` with `COVERAGE_LEVELS.strict` (80/75/80/80)
- Per-package coverage targets can override via `coverageTargets` field
- 138 tests in soql package (Phase 1)

## Development Workflow

Work is tracked via GitHub issues on the soda3js org project board.
Use the `github-soda3js` MCP extension for all GitHub operations.

### Issue structure

- **Epics** (type: Epic) -- one per development phase, never closed by Claude Code
- **Tasks** (type: Task) -- concrete implementation units, sub-issues of epics

### Task lifecycle

1. Confirm task Status is In Progress on the project board before coding
2. Implement with TDD (write test first, watch it fail, implement)
3. Close issues via commit message footers: `closes #N`
4. Update project board Status to Done
5. Update spec if implementation diverged from what it describes

Do NOT close issues manually via the API. The CI/CD pipeline closes
them when the PR merges via the commit footer directives. When squash
merging, aggregate all `closes #N` lines in the squash commit message.

### Spec is a living document

The spec (`docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md`)
is authoritative for architecture but expected to change during
implementation. When code diverges from spec:

- Update the spec to match what was built
- Comment on the task issue explaining the divergence
- If architectural (affects other packages), also comment on the parent epic

### Epic completion

When all tasks under an epic are closed:

- Post a summary comment on the epic (what was built, spec changes, deferred items)
- Do NOT close the epic -- the management environment handles that

### Project board field IDs

Project: soda3js org, #1. Use `github-soda3js:projects_write` with
`method: update_project_item`.

- **Status** (272063678): Todo=f75ad846, In Progress=47fc9ee4, Done=98236657
- **Priority** (272063842): P0=d6121695, P1=887544fb
- **Iteration** (272063845): Iter 1=76d73569, Iter 2=c4902ca4, Iter 3=2c76b619

### Milestones

v0.0.1=#1 (soql), v0.0.2=#2 (client), v0.1.0=#4 (full release)

## Key Commands

```bash
pnpm install                  # Install dependencies
pnpm test                     # Run all tests
pnpm lint                     # Check with Biome
pnpm lint:fix                 # Fix with Biome
pnpm typecheck                # TypeScript check (tsgo)
```

## SODA API Protocol Facts (Verified)

Do not change these without updating the spec and noting on the relevant issue:

- SODA2 GET `/resource/{id}.json` works without auth; `toParams()` is primary target
- SODA3 POST `/api/v3/views/{id}/query.json` returns 403 without app token
- Metadata GET `/api/views/{id}.json` -- no v3 prefix, no auth required
- Export GET `/api/views/{id}/rows.{fmt}?accessType=DOWNLOAD` -- no auth required
- No `Retry-After` header on 429 -- use synthetic exponential backoff
- No pagination headers -- last page signaled by empty JSON array `[]`
- Error shape: `{ code, error: true, message, data? }`
- Metadata timestamps are Unix epoch integers, not ISO strings
- No `rowCount` in metadata -- use `SELECT count(*)`
- String escaping: doubled single quotes, not backslashes
- Column names with non-identifier chars: backtick-quoted
- AST types are public -- exported for `@soda3js/api` transpiler consumption

## Design Documentation

Design docs live in `.claude/design/` with per-module subdirectories.
Configuration: `.claude/design/design.config.json`

Full project spec: `docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md`

**Per-package design docs:**

- **soql architecture:**
  `@./.claude/design/soql/architecture.md`
  Load when modifying AST nodes, compiler output, or adding SoQL functions.
