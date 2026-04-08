---
status: current
module: cli
category: architecture
created: 2026-04-05
updated: 2026-04-07
last-synced: 2026-04-07
completeness: 90
related:
  - ../client/architecture.md
  - ../soql/architecture.md
  - ../config/architecture.md
  - ../cache-fs/architecture.md
dependencies: []
---

# @soda3js/cli - Architecture

Terminal client for querying Socrata open data portals, built with
`@effect/cli` and published as the `soda3` binary.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [Commands](#commands)
5. [Library Modules](#library-modules)
6. [Dependency Strategy](#dependency-strategy)
7. [Testing Strategy](#testing-strategy)

---

## Overview

The CLI provides six commands for interacting with Socrata SODA3 API
portals from the terminal: `query`, `export`, `meta`, `search`, `cache`,
and `config`. It uses TOML-based profile management (via
`@soda3js/config`) for multi-portal configuration and supports multiple
output formats with TTY auto-detection and Ink-based React rendering.

The package depends on `@soda3js/client`, `@soda3js/soql`, and
`@soda3js/config` directly (not `@soda3js/rest`), wires its own
`NodeHttpClient.layerUndici` layer, and controls the full Effect runtime.

---

## Current State

Phase 4+ is complete. Six commands are implemented with Ink-based output
components and integration tests against the replay server.

---

## Rationale

### Why @effect/cli

The CLI uses `@effect/cli` for command parsing rather than popular
alternatives like `commander` or `yargs`. This keeps the CLI in the same
Effect ecosystem as the client library, enabling seamless composition of
Effect programs within command handlers. Error handling, resource cleanup,
and cancellation propagate naturally through the Effect fiber system.

### Why Ink-Based Output

Terminal-aware rendering via React/Ink provides richer output than plain
`console.log`. Ink components support Unicode box-drawing, color, and
layout without manual string formatting. The lazy-loading pattern
(`renderInk()`) ensures Ink and React are only imported when TTY output
is active, avoiding process-exit issues in piped or test contexts.

### Why Config Migration to @soda3js/config

The CLI previously had its own `config-store.ts` for TOML config handling.
Moving to `@soda3js/config` centralized XDG path resolution and config
parsing, enabling the MCP server to share the same config file and
profile format without duplication.

---

## Commands

### `soda3 query <dataset-id>`

Executes a SoQL query against a dataset. Supports structured options
(`--select`, `--where`, `--limit`, `--offset`, `--order`) and a raw
SoQL shorthand (`-q`). Output formatted via `--format` or TTY
auto-detection. TTY mode renders via Ink `Table` component.

### `soda3 export <dataset-id>`

Streams a full dataset export via `GET /api/views/{id}/rows.{fmt}`.
Supports `--format csv|json` and `--output <file>` for writing to disk
instead of stdout.

### `soda3 meta <dataset-id>`

Fetches and displays dataset metadata (name, description, columns, last
updated). Supports `--format table|json`. TTY mode renders via Ink
`MetadataView` component.

### `soda3 search [query]`

Searches the Socrata catalog via the Discovery API. Supports filters:
`--domain`, `--category`, `--tags`, `--only`, `--limit`, `--offset`.
Output formats: `table`, `json`, `ndjson`. TTY mode renders via Ink
`SearchResults` component.

### `soda3 cache`

Cache management with four subcommands:

- `cache status` -- show cache directory info and size
- `cache inspect` -- list cached entries with metadata
- `cache clear` -- remove all cached responses
- `cache prune` -- remove expired entries

### `soda3 config`

Profile management with four subcommands:

- `config init` -- first-time setup, creates config with a default profile
- `config show` -- prints current config as TOML
- `config edit` -- opens config in `$EDITOR`
- `config add-profile <name>` -- adds a named profile

---

## Library Modules

### `domain.ts`

Resolves domain and app token from CLI flags and config (via
`@soda3js/config`). Resolution priority:

1. `--profile <name>` flag -- look up in `Soda3Config` profiles
2. `--domain <domain>` flag -- use directly (no token, SODA2 mode)
3. `defaultProfile` from config -- look up in profiles
4. Error -- no domain could be resolved

Maps the config `token` field to `appToken` for `SodaClientConfig`
compatibility.

### `cache-factory.ts`

Creates a `FileSystemCacheImpl` from CLI flags and config. Reads cache
settings from the resolved profile and global config via `Soda3Config`.
Supports `--no-cache` and `--cache-ttl` CLI overrides.

### `output.ts`

Four output formatters: `table`, `json`, `ndjson`, `csv`. TTY
auto-detection selects the default format:

- Non-TTY (piped): `ndjson`
- TTY with <= 50 rows: `table`
- TTY with > 50 rows: `json`

The `table` formatter renders aligned columns with Unicode box-drawing
separators.

### Ink UI Components (`ui/`)

React/Ink components for rich terminal rendering, lazy-loaded via
`renderInk()` to avoid side effects at module scope:

- `Table.tsx` -- Aligned data table with Unicode borders
- `SearchResults.tsx` -- Discovery API result cards
- `MetadataView.tsx` -- Dataset metadata display
- `ErrorView.tsx` -- Styled error messages
- `Spinner.tsx` -- Loading indicator
- `render.ts` -- `renderInk(factory)` helper and `isTTY()` check

---

## Dependency Strategy

The CLI imports `@soda3js/client` (Effect service library),
`@soda3js/soql` (query builder), and `@soda3js/config` (shared
configuration) as direct dependencies. It does NOT use `@soda3js/rest`
because:

- The CLI needs full Effect composition control for structured error
  handling, observability, and resource management
- It wires its own `NodeHttpClient.layerUndici` HTTP layer
- It controls the Effect runtime via `NodeRuntime.runMain`

Each command handler follows the same pattern:

1. Load config via `Soda3Config.load()`
2. Resolve domain via `resolveDomain(config, options)`
3. Build `SodaClientConfig` from resolved domain/token
4. Optionally create cache via `cache-factory.ts`
5. Provide `SodaClientLive(config)` + `NodeHttpClient.layerUndici`
6. Execute the client operation inside `Effect.gen`
7. Format and print output (Ink components for TTY, plain text otherwise)

---

## Testing Strategy

Unit tests across the library modules and commands, plus integration
tests against the replay server:

- **domain:** Resolution priority, missing profile errors, default
  profile fallback, token mapping
- **output:** All four formatters, CSV escaping, table alignment, TTY
  auto-detection
- **query:** SoQL builder from structured options, raw mode, option
  combinations
- **meta:** Metadata table formatting, column display, date conversion
- **search:** Discovery API formatting, search table/json/ndjson
- **export:** Command structure verification
- **cache:** Cache subcommand structure and formatting
- **config:** Init, show, add-profile via temp directories
- **integration:** End-to-end tests against the replay server for
  query, meta, and example commands

Command handlers that depend on network/Effect runtime are tested
through their extracted helper functions and integration tests.

---

**Document Status:** Current -- reflects Phase 4+ with search command,
Ink components, cache commands, and config migration to `@soda3js/config`.
