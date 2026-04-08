---
status: current
module: config
category: architecture
created: 2026-04-07
updated: 2026-04-07
last-synced: 2026-04-07
completeness: 85
related:
  - ../cli/architecture.md
  - ../cache-fs/architecture.md
  - ../cache-sqlite/architecture.md
  - ../mcp/architecture.md
dependencies: []
---

# @soda3js/config - Architecture

Shared XDG directory resolution, TOML configuration loading, and Effect
Schema-based JSON Schema generation for the soda3js toolkit.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Soda3Config Class](#soda3config-class)
6. [XDG Path Resolution](#xdg-path-resolution)
7. [Effect Schemas](#effect-schemas)
8. [Dependency Model](#dependency-model)
9. [Consumer Packages](#consumer-packages)
10. [Testing Strategy](#testing-strategy)
11. [Future Work](#future-work)

---

## Overview

`@soda3js/config` is a shared configuration package that centralizes XDG
Base Directory resolution, TOML config file parsing, and Effect Schema
definitions for the soda3js toolkit. It replaces the per-package XDG
resolution that previously existed in `cache-fs`, `cache-sqlite`, and `cli`.

The package exports a single `Soda3Config` class with static XDG directory
methods, async/sync config loading factories, immutable builder methods for
profile and cache management, and TOML serialization. It also exports Effect
Schema definitions for the config file shape and cache metadata, enabling
JSON Schema generation for editor tooling.

Single `"."` export. Dependencies: `effect` (for Schema), `smol-toml` (for
TOML parsing).

---

## Current State

The package is fully implemented with four source files:

```text
packages/config/src/
  index.ts                Public API re-exports
  lib/
    soda3-config.ts       Soda3Config class (load, save, builders, XDG)
    xdg.ts                XDG Base Directory path resolution
  schemas/
    config.ts             Effect Schema for config file (ConfigSchema, ProfileSchema, CacheConfigSchema)
    cache.ts              Effect Schema for cache metadata (DatasetFreshnessSchema, CacheEntryMetaSchema)
```

---

## Rationale

### Why a Dedicated Config Package

Before this package, XDG directory resolution was duplicated across three
packages:

- `cache-fs/src/lib/xdg.ts` -- for cache directory paths
- `cache-sqlite/src/node.ts` -- inline XDG resolution for database path
- `cli/src/lib/config-store.ts` -- for config file path

This duplication meant changing the app name or XDG resolution logic
required updating multiple files. Centralizing into `@soda3js/config`
provides a single source of truth for all directory paths.

### Why Immutable Builder Pattern

`Soda3Config` uses immutable builders (`withProfile`, `withDefault`,
`withFormat`, `withCache`) rather than mutable setters. This matches the
immutable pattern used throughout the monorepo (e.g., `SoQLBuilder`) and
enables safe composition without shared state mutation.

### Why Both Sync and Async Loading

`Soda3Config.load()` (async) is the primary API for CLI and long-running
processes. `Soda3Config.loadSync()` exists for the MCP server entry point,
which needs synchronous config loading during startup before any async
context is available.

### Why Effect Schemas

Effect Schema definitions serve dual purposes:

1. Runtime validation when decoding config files
2. JSON Schema generation via `@effect/schema/JSONSchema` for editor
   autocompletion and validation of `config.toml` files

---

## System Architecture

```text
Soda3Config (class)
  |
  +-- Static XDG methods (configDir, cacheDir, stateDir, dataDir, runtimeDir, configPath)
  |     |
  |     +-- lib/xdg.ts (resolution functions)
  |
  +-- Static factories (load, loadSync, empty)
  |     |
  |     +-- smol-toml (TOML parsing)
  |
  +-- Instance queries (getProfile, listProfiles)
  |
  +-- Instance builders (withProfile, withDefault, withFormat, withCache)
  |
  +-- Serialization (toTOML, save)

schemas/
  config.ts    ConfigSchema, ProfileSchema, CacheConfigSchema
  cache.ts     DatasetFreshnessSchema, CacheEntryMetaSchema
```

---

## Soda3Config Class

The core class with private constructor enforcing factory creation:

### Static XDG Methods

- `Soda3Config.configDir()` -- `$XDG_CONFIG_HOME/soda3js` or `~/.config/soda3js`
- `Soda3Config.cacheDir()` -- `$XDG_CACHE_HOME/soda3js` or `~/.cache/soda3js`
- `Soda3Config.stateDir()` -- `$XDG_STATE_HOME/soda3js` or `~/.local/state/soda3js`
- `Soda3Config.dataDir()` -- `$XDG_DATA_HOME/soda3js` or `~/.local/share/soda3js`
- `Soda3Config.runtimeDir()` -- `$XDG_RUNTIME_DIR/soda3js` or `undefined`
- `Soda3Config.configPath()` -- `{configDir}/config.toml`

### Factories

- `Soda3Config.load(path?)` -- async TOML loading with ENOENT fallback to empty
- `Soda3Config.loadSync(path?)` -- synchronous variant for MCP startup
- `Soda3Config.empty()` -- empty config with no profiles

### Instance Fields

- `profiles` -- `Readonly<Record<string, Profile>>` (domain + optional token + optional cache)
- `defaultProfile` -- optional string naming the active profile
- `format` -- optional default output format
- `cache` -- optional global `CacheConfig` (enabled, ttl)

### Immutable Builders

- `withProfile(name, profile)` -- returns new config with profile added/updated
- `withDefault(name)` -- returns new config with default profile set
- `withFormat(format)` -- returns new config with format set
- `withCache(cache)` -- returns new config with global cache settings

### Serialization

- `toTOML()` -- serializes to TOML string via `smol-toml`
- `save(path?)` -- creates parent directory and writes TOML

---

## XDG Path Resolution

`lib/xdg.ts` resolves all five XDG Base Directory paths plus the config
file path. Each function respects the corresponding `XDG_*` environment
variable with a fallback to the platform default:

| Function | Env Var | Default |
| --- | --- | --- |
| `configDir()` | `XDG_CONFIG_HOME` | `~/.config/soda3js` |
| `cacheDir()` | `XDG_CACHE_HOME` | `~/.cache/soda3js` |
| `stateDir()` | `XDG_STATE_HOME` | `~/.local/state/soda3js` |
| `dataDir()` | `XDG_DATA_HOME` | `~/.local/share/soda3js` |
| `runtimeDir()` | `XDG_RUNTIME_DIR` | `undefined` |
| `configPath()` | (derived) | `{configDir}/config.toml` |

The app name `soda3js` is a constant in `xdg.ts`.

---

## Effect Schemas

### Config Schemas (`schemas/config.ts`)

- `CacheConfigSchema` -- `{ enabled?: boolean, ttl?: number }`
- `ProfileSchema` -- `{ domain: string, token?: string, cache?: CacheConfig }`
- `ConfigSchema` -- `{ format?: string, default_profile?: string, cache?: CacheConfig, profiles: Record<string, Profile> }`

All schemas are annotated with `description` for JSON Schema generation.

### Cache Metadata Schemas (`schemas/cache.ts`)

- `DatasetFreshnessSchema` -- tracks when a dataset was last checked
  for freshness (`_freshness.json` files)
- `CacheEntryMetaSchema` -- metadata sidecar for cached responses
  (`*.meta.json` files)

These schemas provide machine-readable descriptions of the cache file
formats used by `cache-fs`.

---

## Dependency Model

| Dependency | Type | Purpose |
| --- | --- | --- |
| `effect` | fixed | Schema definitions and JSON Schema generation |
| `smol-toml` | fixed | TOML parsing and serialization |

No peer dependencies. No platform-specific imports beyond `node:fs`,
`node:os`, and `node:path`.

---

## Consumer Packages

### `@soda3js/cli`

Imports `Soda3Config` for async config loading, profile resolution,
domain resolution, and cache factory wiring. Replaced the previous
`config-store.ts` module with `Soda3Config.load()`.

### `@soda3js/mcp`

Imports `Soda3Config` for synchronous config loading during MCP server
startup. Uses `Soda3Config.loadSync()` and `Soda3Config.cacheDir()`.

### `@soda3js/cache-fs`

Imports `Soda3Config.cacheDir()` for default cache directory resolution
in `FileSystemCacheLive`. Re-exports `Soda3Config` for consumer convenience.
Replaced the previous `lib/xdg.ts` module.

### `@soda3js/cache-sqlite`

Imports `Soda3Config.cacheDir()` for default database path resolution
in `NodeSqliteCacheLive`. Replaced the previous inline XDG resolution.

---

## Testing Strategy

- **Soda3Config:** TOML round-tripping, profile CRUD, ENOENT handling,
  immutable builder verification, factory methods
- **XDG:** Path resolution with mocked environment variables
- **Schemas:** Effect Schema decode/encode round-trips

---

## Future Work

- Add JSON Schema generation script for editor integration
- Add config file migration for breaking format changes
- Consider schema validation during `fromTOML` parsing
- Add per-profile output format override

---

**Document Status:** Current -- reflects initial implementation on
`feat/wrap-up` branch.

**Next Update:** When config schema validation or migration is added.
