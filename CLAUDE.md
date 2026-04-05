# soda3js/tools

A modern TypeScript toolkit for the Socrata SODA3 Open Data API.

## Current Phase

**Phase 4 — `@soda3js/cli` — Up Next**

Phases 1 (soql), 2 (protocol, client, rest), and 3 (server) are
complete. Current branch: `feat/cli`. Phase 4 builds the terminal
client package (`cli`).

Before writing any code, read `.claude/design/workflow/agent-workflow.md`. It explains the
full issue/spec/board workflow expected in every session.

---

## Project Structure

Monorepo with six packages under `packages/`:

| Package | Purpose | Published |
| --- | --- | --- |
| `@soda3js/soql` | SoQL query builder (pure TS, zero deps) -- Phase 1 complete | Yes |
| `@soda3js/protocol` | Wire-format TS interfaces for SODA3 responses (zero deps) | Yes |
| `@soda3js/client` | Platform-agnostic Effect service library (single entry point) | Yes |
| `@soda3js/rest` | Batteries-included REST client (`Soda3Client` class, subpath exports: `./node`, `./bun`, `./browser`) | Yes |
| `@soda3js/cli` | Terminal client (`@effect/cli`, bin: `soda3`) | Yes |
| `@soda3js/server` | Replay/record/chaos test server (Node, Vitest plugin) | No (private) |

Dependency graph: `soql` and `protocol` are leaves (zero deps).
`client` depends on `soql` (peers: `effect`, `@effect/platform`).
`rest` depends on `client` + `soql` (fixed deps, not peers; bundles
all Effect platform deps). `cli` depends on `client` + `soql`
directly (not `rest`). `server` has no runtime deps (optional peer:
`vitest`).

## Toolchain

- **Package manager:** pnpm with workspaces
- **Build orchestration:** Turborepo
- **Linting/formatting:** Biome (extends `@savvy-web/lint-staged/biome/silk.jsonc`)
- **Testing:** `@savvy-web/vitest` for test discovery and coverage
- **Versioning:** `@savvy-web/changesets` with fixed versioning across `soql`, `protocol`, `client`, `rest`, `cli`
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

## Key Commands

```bash
pnpm install                  # Install dependencies
pnpm test                     # Run all tests
pnpm lint                     # Check with Biome
pnpm lint:fix                 # Fix with Biome
pnpm typecheck                # TypeScript check (tsgo)
```

## Root-Level Scripts

The root workspace has `@soda3js/rest`, `@soda3js/cli`, and `tsx` as
devDependencies. This allows running ad-hoc scripts that import from
published packages (e.g., `import { Soda3Client } from "@soda3js/rest/node"`).

All packages have `prepare` scripts that build `dist/dev/`, so workspace
symlinks resolve to compiled output after `pnpm install`.

```bash
npx tsx scripts/test-rest.ts  # Exercise rest API against live Socrata portals
```

`SOCRATA_APP_TOKEN` env var is required for SODA3-mode requests in
`scripts/test-rest.ts`.

This setup prepares for Phase 4 (CLI) testing: root-level integration
tests will spin up the test server (Phase 3) and point both CLI and
rest client at it.

## Design Documentation

- **Agent workflow guide:** `.claude/design/workflow/agent-workflow.md` — read this first every session
- **Full project spec:** `docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md`
- **Design docs:** `.claude/design/` with per-module subdirectories
- **Server architecture:** `.claude/design/server/architecture.md`
- **Design config:** `.claude/design/design.config.json`
