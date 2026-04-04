# soda3js/tools

A modern TypeScript toolkit for the Socrata SODA3 Open Data API.

## Project Structure

Monorepo with five packages under `packages/`:

| Package | Purpose | Published |
| --- | --- | --- |
| `@soda3js/soql` | SoQL query builder (pure TS, zero deps) | Yes |
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
- **Builders:** `@savvy-web/rslib-builder` for soql/client/cli; raw Bun for api/server

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

## Design Documentation

Design docs live in `.claude/design/` with per-module subdirectories.
Configuration: `.claude/design/design.config.json`

Full project spec: `docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md`
