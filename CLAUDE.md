# soda3js/tools

A modern TypeScript toolkit for the Socrata SODA3 Open Data API.

## Current Phase

Phase 5 (wrap-up). Phases 1 (soql), 2 (protocol, client, rest),
3 (server), and 4 (cli, config, mcp) are complete.
Current branch: `feat/wrap-up`.

Before writing any code, read `.claude/design/workflow/agent-workflow.md`. It explains the
full issue/spec/board workflow expected in every session.

---

## Project Structure

Monorepo with eleven packages under `packages/`:

| Package | Purpose | Published |
| --- | --- | --- |
| `@soda3js/soql` | SoQL query builder (pure TS, zero deps) | Yes |
| `@soda3js/protocol` | Wire-format TS interfaces for SODA3 responses (zero deps) | Yes |
| `@soda3js/client` | Platform-agnostic Effect service library (single entry point) | Yes |
| `@soda3js/rest` | Batteries-included REST client (`Soda3Client` class, subpath exports: `./node`, `./bun`, `./browser`) | Yes |
| `@soda3js/cli` | Terminal client (`@effect/cli` + Ink, bin: `soda3`, 6 subcommands) | Yes |
| `@soda3js/config` | Shared XDG dirs, TOML config loading, schemas (`Soda3Config` class) | Yes |
| `@soda3js/mcp` | MCP server for AI agents (8 tools, 3 resources, bin: `soda3-mcp`) | Yes |
| `@soda3js/cache` | Response caching (MemoryCache, BrowserCache, cache key builder) | Yes |
| `@soda3js/cache-fs` | Filesystem cache (XDG dirs, Effect Layer) | Yes |
| `@soda3js/cache-sqlite` | SQLite cache (Effect SQL, migrations) | Yes |
| `@soda3js/server` | Replay/record/chaos test server (Node, Vitest plugin) | No (private) |

Dependency graph: `soql` and `protocol` are leaves (zero deps).
`config` depends on `effect` + `smol-toml` (XDG dirs, TOML config).
`client` depends on `soql` (peers: `effect`, `@effect/platform`).
`rest` depends on `client` + `soql` (fixed deps, not peers; bundles
all Effect platform deps). `cli` depends on `client` + `soql` +
`config` + `cache-fs` (Ink for UI). `mcp` depends on `client` +
`soql` + `config` (MCP SDK + Zod for tool schemas). `cache` depends
on `protocol`. `cache-fs` peers: `effect`, `@effect/platform`.
`cache-sqlite` peers: `effect`, `@effect/sql`. `server` has no
runtime deps (optional peer: `vitest`).

## Toolchain

- **Package manager:** pnpm with workspaces
- **Build orchestration:** Turborepo
- **Linting/formatting:** Biome (extends `@savvy-web/lint-staged/biome/silk.jsonc`)
- **Testing:** `@savvy-web/vitest` for test discovery and coverage
- **Versioning:** `@savvy-web/changesets` with fixed versioning across `soql`, `protocol`, `client`, `rest`, `cli`, `config`, `mcp`, `cache`, `cache-fs`, `cache-sqlite`
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
npx soda3 search "crime"      # CLI search via Discovery API
npx soda3-mcp                 # Start MCP server (stdio transport)
```

`SOCRATA_APP_TOKEN` env var is required for SODA3-mode requests.
Config profiles in `~/.config/soda3js/config.toml` can also store tokens.

## Design Documentation

- **Agent workflow guide:** `.claude/design/workflow/agent-workflow.md` -- read this first every session
- **Full project spec:** `docs/superpowers/specs/2026-04-02-soda3js-toolkit-design.md`
- **Design docs:** `.claude/design/` with per-module subdirectories
- **SoQL architecture:** `.claude/design/soql/architecture.md`
- **Client architecture:** `.claude/design/client/architecture.md`
- **REST architecture:** `.claude/design/rest/architecture.md`
- **CLI architecture:** `.claude/design/cli/architecture.md`
- **Server architecture:** `.claude/design/server/architecture.md`
- **Cache architecture:** `.claude/design/cache/architecture.md`
- **Cache-FS architecture:** `.claude/design/cache-fs/architecture.md`
- **Cache-SQLite architecture:** `.claude/design/cache-sqlite/architecture.md`
- **Protocol architecture:** `.claude/design/protocol/architecture.md`
- **Design config:** `.claude/design/design.config.json`
