# @soda3js/cache

In-memory response cache and cache key builder for the [Socrata SODA3 API](https://dev.socrata.com/). Platform-agnostic, works in Node.js, Bun, and browsers.

For filesystem caching, see [`@soda3js/cache-fs`](../cache-fs/). For SQLite-backed caching, see [`@soda3js/cache-sqlite`](../cache-sqlite/).

## Install

```bash
npm install @soda3js/cache
```

## MemoryCache

An in-memory `CacheStore` implementation backed by a `Map`. Suitable for short-lived processes, tests, and browser environments.

```typescript
import { MemoryCache } from "@soda3js/cache";

const cache = new MemoryCache({ maxEntries: 100 });

// Use with @soda3js/rest
import { Soda3Client } from "@soda3js/rest/node";

const client = new Soda3Client({
  domain: "data.sfgov.org",
  cache,
  cacheTtl: 300,
});
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxEntries` | `number` | unlimited | Maximum cached entries before LRU eviction |

### Methods

| Method | Description |
| --- | --- |
| `get(key)` | Retrieve a cached entry |
| `set(key, entry)` | Store a cache entry (evicts oldest if over limit) |
| `has(key)` | Check if a key exists |
| `invalidate(key)` | Remove a single entry |
| `prune(options?)` | Remove entries by age or cleanable flag |
| `clear()` | Remove all entries |

## buildCacheKey

Generate deterministic cache keys from query parameters. Uses SHA-256 on Node.js, FNV-1a as a fallback in browsers.

```typescript
import { buildCacheKey } from "@soda3js/cache";

const key = await buildCacheKey({
  domain: "data.sfgov.org",
  datasetId: "yitu-d5am",
  query: "$select=title&$limit=10",
  format: "json",
  rowsUpdatedAt: 1700000000,
});
// "data.sfgov.org/yitu-d5am/a1b2c3d4e5f6..."
```

## Types

Re-exported from `@soda3js/protocol` for convenience:

- `CacheStore` -- async key-value store interface
- `CacheEntry` -- cached response with metadata
- `CacheKeyInput` -- input for cache key generation
- `DatasetFreshness` -- dataset freshness tracking
- `PruneOptions` / `PruneResult` -- prune operation types

## License

[MIT](./LICENSE)
