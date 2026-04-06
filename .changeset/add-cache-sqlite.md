---
"@soda3js/cache-sqlite": minor
---

## Features

### Adds @soda3js/cache-sqlite Package

Persistent cache backed by SQLite via `@effect/sql` with automatic schema migrations. Ideal for desktop applications and long-running servers.

### Effect SQL integration

`SqliteCache` Effect Context.Tag with `SqliteCacheLive` Layer. Platform entry point at `@soda3js/cache-sqlite/node` provides `NodeSqliteCacheLive` pre-wired with `@effect/sql-sqlite-node`. Bun entry point available as a placeholder for `@effect/sql-sqlite-bun`.

### Schema

Two tables: `responses` (key, body as BLOB, content type, headers as JSON, timestamps, freshness metadata) and `freshness` (domain, dataset, rowsUpdatedAt, lastChecked, TTL). Indexes on domain, created, and cleanable for efficient pruning.
