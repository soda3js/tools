---
status: current
module: cache-sqlite
category: architecture
created: 2026-04-06
updated: 2026-04-06
last-synced: 2026-04-06
completeness: 85
related:
  - ../protocol/architecture.md
  - ../cache/architecture.md
  - ../cache-fs/architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/cache-sqlite - Architecture

Effect SQL-based SQLite response cache for the Socrata SODA3 API. Stores
response bodies as BLOBs and metadata in a single SQLite database with
automatic schema migration. Designed for high-volume and concurrent-access
scenarios.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [SqliteCacheImpl](#sqlitecacheimpl)
7. [Schema Migration](#schema-migration)
8. [Effect Integration](#effect-integration)
9. [Node Wiring](#node-wiring)
10. [Subpath Export Strategy](#subpath-export-strategy)
11. [Dependency Model](#dependency-model)
12. [Testing Strategy](#testing-strategy)
13. [Future Work](#future-work)

---

## Overview

`@soda3js/cache-sqlite` provides a `CacheStore` implementation backed by
SQLite via `@effect/sql`. Response bodies are stored as BLOBs in a
`responses` table alongside metadata columns. A separate `freshness` table
tracks per-domain dataset freshness for smart cache invalidation.

The package provides an Effect `Context.Tag` (`SqliteCache`) and a generic
`Layer` factory (`SqliteCacheLive`) that requires a `SqlClient` dependency.
Platform-specific wiring is provided via `NodeSqliteCacheLive` (which bundles
`@effect/sql-sqlite-node`). A Bun entry point exists as a placeholder.

---

## Current State

The package is fully implemented with seven source files:

```text
packages/cache-sqlite/src/
  index.ts              Main entry (SqliteCache Tag, SqliteCacheLive Layer)
  node.ts               Node wiring (NodeSqliteCacheLive with sqlite-node)
  bun.ts                Bun placeholder (re-exports Tag and options)
  lib/
    sqlite-cache.ts     SqliteCacheImpl (CacheStore implementation)
    xdg.ts              XDG cache directory resolution
    migrations/
      0001-initial.ts   Initial schema (responses + freshness tables)
```

---

## Rationale

### Why SQLite over Filesystem

For CLI tools and applications that cache many responses or face concurrent
access (multiple processes, background refresh), SQLite provides:

- ACID transactions (no corrupt index files)
- Efficient range queries for pruning (SQL `WHERE created < cutoff`)
- Single-file database (easy backup, no directory of loose files)
- Built-in WAL mode for concurrent readers

The tradeoff is a native dependency (`better-sqlite3` via
`@effect/sql-sqlite-node`), which requires compilation. For environments
where native deps are undesirable, `@soda3js/cache-fs` is the alternative.

### Why Effect SQL

The package targets Effect-based consumers (the CLI, the client library).
`@effect/sql` provides:

- Type-safe SQL template literals
- Automatic connection management
- Built-in migration support
- Composable layers (swap SQLite for another backend trivially)

The `SqliteCacheImpl` class receives a pre-wired `runSql` function rather
than the raw `SqlClient`, keeping the implementation class free from direct
Effect dependencies in its method signatures while still using Effect
internally.

### Why a runSql Abstraction

`SqliteCacheImpl` takes a `runSql` callback:

```typescript
runSql: <A>(effect: Effect<A, unknown, SqlClient>) => Promise<A>
```

This decouples the cache implementation from the Effect runtime and
`SqlClient` provisioning. The Layer factory creates this callback once
during initialization, providing the `SqlClient` and running via
`Effect.runPromise`. The implementation class then uses plain `Promise`
returns, conforming to the `CacheStore` interface without requiring callers
to manage Effect contexts.

---

## System Architecture

```text
NodeSqliteCacheLive (node.ts)
  |
  +-- SqliteClient.layer (provides SqlClient)
  |
  v
SqliteCacheLive (index.ts, generic Layer)
  |
  +-- Runs migration (0001-initial.ts)
  +-- Creates runSql callback (binds SqlClient)
  |
  v
SqliteCache (Context.Tag)
  |
  v
SqliteCacheImpl (CacheStore)
  |
  +-- runSql(<Effect>) -> Promise
  |     |
  |     +-- get: SELECT from responses
  |     +-- set: INSERT OR REPLACE into responses
  |     +-- has: SELECT 1 existence check
  |     +-- invalidate: DELETE from responses
  |     +-- prune: DELETE WHERE created < cutoff
  |
  +-- rowToEntry() helper (DB row -> CacheEntry)
```

---

## Database Schema

Defined in `lib/migrations/0001-initial.ts`:

### responses table

| Column | Type | Notes |
| --- | --- | --- |
| key | TEXT | PRIMARY KEY |
| body | BLOB | Response body bytes |
| content_type | TEXT | NOT NULL |
| headers | TEXT | JSON-encoded headers |
| created | TEXT | ISO 8601 timestamp |
| dataset_id | TEXT | NOT NULL |
| domain | TEXT | NOT NULL |
| rows_updated_at | INTEGER | Unix timestamp (nullable) |
| size_bytes | INTEGER | NOT NULL |
| ttl | INTEGER | Default 300 |
| cleanable | INTEGER | Boolean as 0/1, default 1 |

**Indexes:**

- `idx_responses_domain` on `(domain, dataset_id)`
- `idx_responses_created` on `(created)`
- `idx_responses_cleanable` on `(cleanable)`

### freshness table

| Column | Type | Notes |
| --- | --- | --- |
| domain | TEXT | NOT NULL, part of composite PK |
| dataset_id | TEXT | NOT NULL, part of composite PK |
| rows_updated_at | INTEGER | NOT NULL |
| last_checked | TEXT | ISO 8601 timestamp |
| ttl | INTEGER | Default 300 |

Primary key: `(domain, dataset_id)`

All tables use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
for idempotent migration.

---

## SqliteCacheImpl

The core class in `lib/sqlite-cache.ts` implements all five `CacheStore`
methods by building Effect programs and running them through `runSql`:

- **get(key):** `SELECT` with `LIMIT 1`, returns `undefined` if no rows.
  Uses `rowToEntry()` to convert snake_case DB columns to camelCase
  `CacheEntry` fields and handle `BLOB -> Uint8Array`, `INTEGER -> boolean`,
  and `TEXT -> JSON` conversions.

- **set(key, entry):** `INSERT OR REPLACE` with all columns. Headers are
  JSON-stringified. Cleanable boolean is converted to integer (0/1).

- **has(key):** `SELECT 1 ... LIMIT 1` existence check.

- **invalidate(key):** Checks existence first, then `DELETE`. Returns boolean
  indicating whether the entry existed.

- **prune(options):** Builds a cutoff ISO timestamp from `maxAge` seconds.
  Queries matching rows to calculate `freedBytes`, then deletes them. Two
  query variants handle the `cleanableOnly` flag. Returns early with zero
  counts if `maxAge` is undefined.

### Type Conversions (rowToEntry)

| DB Type | TypeScript Type | Conversion |
| --- | --- | --- |
| BLOB | Uint8Array | Buffer.isBuffer check, ArrayBuffer fallback |
| TEXT (headers) | Record<string, string> | JSON.parse with empty-object fallback |
| INTEGER (cleanable) | boolean | `Number(row.cleanable) === 1` |
| INTEGER (rows_updated_at) | number | `Number()` |
| TEXT (snake_case) | string (camelCase) | Direct field mapping |

---

## Schema Migration

The migration system uses a single Effect program in
`lib/migrations/0001-initial.ts` that creates both tables and all indexes.
The migration runs during Layer construction (`SqliteCacheLive`) before any
cache operations:

1. `SqliteCacheLive` acquires `SqlClient` from the dependency graph
2. Runs `migration0001` with the `SqlClient` provided
3. Wraps failures with `Effect.orDie` (migration failure is fatal)
4. Creates the `runSql` callback
5. Returns `SqliteCacheImpl`

All DDL statements use `IF NOT EXISTS` so the migration is idempotent and
safe to run on every startup.

---

## Effect Integration

- **SqliteCache:** `Context.Tag("@soda3js/cache-sqlite/SqliteCache")` typed
  as `CacheStore`. Effect programs depend on this tag to access the cache.

- **SqliteCacheLive(options?):** Generic Layer that requires
  `SqlClient.SqlClient` as a dependency. Runs the migration, builds `runSql`,
  and provides `SqliteCache`. Accepts optional `dbPath` and `defaultTtl`.

The Layer uses `Layer.effect` (not `Layer.succeed`) because initialization
requires running the migration Effect.

---

## Node Wiring

`node.ts` exports `NodeSqliteCacheLive`, a fully-wired Layer that requires
no dependencies:

1. Resolves the database path from options or XDG (`~/.cache/soda3js/cache.db`)
2. Creates a `SqliteClient.layer` with that filename
3. Provides it to `SqliteCacheLive`
4. Wraps with `Layer.orDie` (SQLite connection failure is fatal)

The result is a `Layer.Layer<SqliteCache>` with no requirements -- ready
for direct use in `Effect.runPromise` or composition into larger Layer
graphs.

---

## Subpath Export Strategy

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./node": "./src/node.ts",
    "./bun": "./src/bun.ts"
  }
}
```

- `"."` exports: `SqliteCache` tag, `SqliteCacheLive` generic Layer,
  `SqliteCacheOptions`, protocol cache types
- `"./node"` exports: `NodeSqliteCacheLive` with `@effect/sql-sqlite-node`
  wiring, plus everything from `"."`
- `"./bun"` exports: placeholder that re-exports the tag and options.
  Bun SQLite support requires `@effect/sql-sqlite-bun` which is not yet
  wired.

---

## Dependency Model

| Dependency | Type | Purpose |
| --- | --- | --- |
| `@soda3js/protocol` | fixed | `CacheStore` interface and cache types |
| `effect` | peer | Effect runtime, Context.Tag, Layer |
| `@effect/platform` | peer | Platform abstractions |
| `@effect/sql` | peer | SqlClient, SQL template literals |
| `@effect/sql-sqlite-node` | peer (optional) | Node SQLite bindings |
| `@effect/experimental` | peer | Experimental Effect utilities |

The `@effect/sql-sqlite-node` peer dependency is marked optional because
consumers using only the `"."` entry point (generic Layer) may provide their
own `SqlClient` implementation.

---

## Testing Strategy

- **SqliteCacheImpl:** Full CacheStore contract tests with in-memory SQLite
  (`:memory:` filename). get/set/has/invalidate/prune with real SQL execution.
- **Migration:** Verify idempotent table and index creation.
- **rowToEntry:** Unit tests for BLOB-to-Uint8Array, JSON header parsing,
  boolean conversion.
- **NodeSqliteCacheLive:** Integration test with a temp-file database.

---

## Future Work

- Wire Bun SQLite support (`@effect/sql-sqlite-bun`) in the `./bun` entry
- Add freshness table query methods to `SqliteCacheImpl`
- Add `VACUUM` support for reclaiming space after large prune operations
- Consider WAL mode configuration for concurrent access
- Add cache size reporting query (total rows, total bytes)
- Consider connection pooling for high-concurrency scenarios

---

**Document Status:** Current -- all planned SQLite cache functionality
implemented on `feat/caching` branch. Cache keys are now path-like
(`domain/datasetId/hash`) following the hierarchical refactor, but SQLite
treats them as opaque TEXT primary keys -- no schema changes required.

**Next Update:** When Bun SQLite support is wired or when the `query` column
is added to the responses table to support the new `CacheEntry.query` field.
