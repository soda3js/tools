# @soda3js/cache-sqlite

SQLite-backed response cache for the [Socrata SODA3 API](https://dev.socrata.com/). Uses [Effect SQL](https://effect.website/docs/sql/) for database access with automatic schema migrations.

## Install

```bash
npm install @soda3js/cache-sqlite effect @effect/sql @effect/sql-sqlite-node
```

`effect` and `@effect/sql` are peer dependencies. You also need a SQLite driver such as `@effect/sql-sqlite-node`.

## Quick Start

```typescript
import { SqliteCache, SqliteCacheLive } from "@soda3js/cache-sqlite";
import { SqliteMigrator } from "@effect/sql-sqlite-node/Migrator";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Layer } from "effect";

// 1. Create the SQLite client layer
const sqliteLayer = SqliteClient.layer({
  filename: "./soda3-cache.db",
});

// 2. Create the cache layer (runs migrations automatically)
const cacheLayer = SqliteCacheLive({ defaultTtl: 300 }).pipe(
  Layer.provide(sqliteLayer),
);
```

## Effect Layer

### SqliteCache / SqliteCacheLive

The `SqliteCache` is an Effect Context Tag backed by the `CacheStore` interface. `SqliteCacheLive` creates the layer, automatically running the initial migration to create the `responses` table.

```typescript
import { SqliteCache, SqliteCacheLive } from "@soda3js/cache-sqlite";

const layer = SqliteCacheLive({ defaultTtl: 300 });
// Requires SqlClient.SqlClient in the Effect context
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultTtl` | `number` | `300` | Default TTL in seconds |

## CacheStore Methods

The underlying `SqliteCacheImpl` implements the full `CacheStore` interface:

| Method | Description |
| --- | --- |
| `get(key)` | Retrieve a cached entry from the `responses` table |
| `set(key, entry)` | Insert or replace a cache entry |
| `has(key)` | Check if a key exists |
| `invalidate(key)` | Delete a single entry |
| `prune(options?)` | Delete entries older than `maxAge` seconds |

## Types

Re-exported from `@soda3js/protocol`:

- `CacheStore`, `CacheEntry`, `CacheKeyInput`
- `DatasetFreshness`, `PruneOptions`, `PruneResult`

## License

[MIT](./LICENSE)
