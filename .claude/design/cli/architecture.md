---
status: current
module: cli
category: architecture
created: 2026-04-05
updated: 2026-04-05
last-synced: 2026-04-05
completeness: 90
related:
  - ../client/architecture.md
  - ../soql/architecture.md
dependencies: []
---

# @soda3js/cli - Architecture

Terminal client for querying Socrata open data portals, built with
`@effect/cli` and published as the `soda3` binary.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Commands](#commands)
4. [Library Modules](#library-modules)
5. [Dependency Strategy](#dependency-strategy)
6. [Testing Strategy](#testing-strategy)

---

## Overview

The CLI provides four commands for interacting with Socrata SODA3 API
portals from the terminal: `query`, `export`, `meta`, and `config`. It
uses TOML-based profile management for multi-portal configuration and
supports multiple output formats with TTY auto-detection.

The package depends on `@soda3js/client` and `@soda3js/soql` directly
(not `@soda3js/rest`), wires its own `NodeHttpClient.layerUndici` layer,
and controls the full Effect runtime.

---

## Current State

Phase 4 is complete. All four commands are implemented with 75 unit tests.
The package is ready for the v0.1.0 release.

---

## Commands

### `soda3 query <dataset-id>`

Executes a SoQL query against a dataset. Supports structured options
(`--select`, `--where`, `--limit`, `--offset`, `--order`) and a raw
SoQL shorthand (`-q`). Output formatted via `--format` or TTY
auto-detection.

### `soda3 export <dataset-id>`

Streams a full dataset export via `GET /api/views/{id}/rows.{fmt}`.
Supports `--format csv|json` and `--output <file>` for writing to disk
instead of stdout.

### `soda3 meta <dataset-id>`

Fetches and displays dataset metadata (name, description, columns, last
updated). Supports `--format table|json`.

### `soda3 config`

Profile management with four subcommands:

- `config init` -- first-time setup, creates config with a default profile
- `config show` -- prints current config as TOML
- `config edit` -- opens config in `$EDITOR`
- `config add-profile <name>` -- adds a named profile

---

## Library Modules

### `config-store.ts`

TOML config store at `~/.config/soda3js/config.toml` (XDG-compliant,
respects `XDG_CONFIG_HOME`). Provides read/write operations and profile
CRUD. Uses `smol-toml` for parsing.

Config shape:

```toml
format = "table"
default_profile = "nyc"

[profiles.nyc]
domain = "data.cityofnewyork.us"
token = "..."
```

### `domain.ts`

Resolves domain and app token from CLI flags and config. Resolution
priority:

1. `--profile <name>` flag -- look up in config profiles
2. `--domain <domain>` flag -- use directly (no token, SODA2 mode)
3. `default_profile` from config -- look up in config profiles
4. Error -- no domain could be resolved

Maps the config `token` field to `appToken` for `SodaClientConfig`
compatibility.

### `output.ts`

Four output formatters: `table`, `json`, `ndjson`, `csv`. TTY
auto-detection selects the default format:

- Non-TTY (piped): `ndjson`
- TTY with <= 50 rows: `table`
- TTY with > 50 rows: `json`

The `table` formatter renders aligned columns with Unicode box-drawing
separators.

---

## Dependency Strategy

The CLI imports `@soda3js/client` (Effect service library) and
`@soda3js/soql` (query builder) as direct dependencies. It does NOT use
`@soda3js/rest` because:

- The CLI needs full Effect composition control for structured error
  handling, observability, and resource management
- It wires its own `NodeHttpClient.layerUndici` HTTP layer
- It controls the Effect runtime via `NodeRuntime.runMain`

Each command handler follows the same pattern:

1. Read config via `readConfig()`
2. Resolve domain via `resolveDomain(config, options)`
3. Build `SodaClientConfig` from resolved domain/token
4. Provide `SodaClientLive(config)` + `NodeHttpClient.layerUndici`
5. Execute the client operation inside `Effect.gen`
6. Format and print output

---

## Testing Strategy

75 unit tests across the library modules and commands:

- **config-store** (12 tests): TOML round-tripping, XDG path resolution,
  profile CRUD, ENOENT handling via temp directories
- **domain** (8 tests): Resolution priority, missing profile errors,
  default profile fallback, token mapping
- **output** (19 tests): All four formatters, CSV escaping, table
  alignment, TTY auto-detection
- **query** (14 tests): SoQL builder from structured options, raw mode,
  option combinations
- **meta** (12 tests): Metadata table formatting, column display, date
  conversion
- **export** (3 tests): Command structure verification
- **config** (8 tests): Init, show, add-profile via temp directories

Command handlers that depend on network/Effect runtime are tested
through their extracted helper functions rather than end-to-end.
Integration tests against the replay server are planned under issue #31.

---

**Document Status:** Current -- reflects Phase 4 complete.
