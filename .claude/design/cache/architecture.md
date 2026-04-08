---
status: current
module: cache
category: architecture
created: 2026-04-06
updated: 2026-04-07
last-synced: 2026-04-07
completeness: 90
related:
  - ../protocol/architecture.md
  - ../cache-fs/architecture.md
  - ../cache-sqlite/architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/cache - Architecture

Zero-dependency response cache for the Socrata SODA3 API. Provides an
in-process memory cache, a browser IndexedDB cache, and a deterministic
cache key builder. All implementations conform to the `CacheStore` interface
defined in `@soda3js/protocol`.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [Cache Key Builder](#cache-key-builder)
5. [MemoryCache](#memorycache)
6. [BrowserCache](#browsercache)
7. [Subpath Export Strategy](#subpath-export-strategy)
8. [Dependency Model](#dependency-model)
9. [Testing Strategy](#testing-strategy)
10. [Future Work](#future-work)

---

## Overview

`@soda3js/cache` is the lightweight, zero-dep (beyond `@soda3js/protocol`)
cache package for environments where Effect is not available or not desired.
It provides two `CacheStore` implementations -- `MemoryCache` for in-process
caching and `BrowserCache` for IndexedDB persistence -- plus a `buildCacheKey`
function for deterministic key generation from request parameters.

The package has two subpath exports: `"."` (MemoryCache + key builder) and
`"./browser"` (adds BrowserCache). The main entry excludes BrowserCache to
avoid pulling in DOM type references in Node/Bun environments.

---

## Current State

The package is fully implemented with four source files:

```text
packages/cache/src/
  index.ts             Main entry (MemoryCache, buildCacheKey, protocol re-exports)
  browser.ts           Browser entry (adds BrowserCache)
  lib/
    cache-key.ts       buildCacheKey() with SHA-256 + FNV-1a fallback
    memory-cache.ts    MemoryCache with LRU eviction
    browser-cache.ts   BrowserCache with IndexedDB backend
```

---

## Rationale

### Why a Separate Package from cache-fs and cache-sqlite

The cache package targets environments with no filesystem or database access
(browsers) and environments where Effect is not used (simple Node scripts,
serverless functions). Keeping it separate from the Effect-based backends
means consumers who only need `MemoryCache` never pull in Effect, `@effect/sql`,
or Node filesystem APIs.

### Why Zero Dependencies Beyond Protocol

`@soda3js/protocol` is a pure type/interface package with zero runtime code
of its own. By depending only on protocol, this package stays suitable for
browsers, edge runtimes, and any TypeScript environment. The `buildCacheKey`
function uses a dynamic import for `node:crypto` with an FNV-1a fallback so
it works in all environments without bundler configuration.

### Why Two Subpath Exports

BrowserCache references `indexedDB`, `IDBDatabase`, and other DOM globals.
Including it in the main `"."` export would require DOM type references in
Node/Bun environments, causing type errors or requiring `lib: ["dom"]` in
non-browser TypeScript configs. The separate `"./browser"` entry isolates
DOM dependencies to consumers who explicitly opt in.

---

## Cache Key Builder

`buildCacheKey()` in `lib/cache-key.ts` generates a deterministic 16-character
hex string from a `CacheKeyInput`:

1. Joins input fields (domain, datasetId, query, format, optionally
   rowsUpdatedAt) with null byte (`\0`) separators
2. Attempts SHA-256 via dynamic `import("node:crypto")`
3. Falls back to FNV-1a (64-bit) if `node:crypto` is unavailable (browsers,
   edge runtimes)

The null byte separator prevents ambiguity between fields (e.g.,
`"a\0bc"` vs `"ab\0c"`). The 16-character truncation provides sufficient
collision resistance for cache keys (64 bits of entropy from SHA-256, full
64 bits from FNV-1a).

The function is async because of the dynamic import. Both code paths
produce a fixed-length 16-character hex string.

---

## MemoryCache

`MemoryCache` in `lib/memory-cache.ts` implements `CacheStore` using an
in-process `Map<string, CacheEntry>`:

- **LRU eviction:** When `maxEntries` is set and the store exceeds the limit
  after a `set()`, the entry with the oldest `created` timestamp is evicted.
  This is a simple oldest-created strategy, not a true access-recency LRU,
  which is sufficient for caching API responses that are immutable once
  created.
- **Prune:** Iterates all entries, removing those older than `maxAge` seconds.
  Respects `cleanableOnly` to skip entries marked as non-cleanable.
- **Clear:** Additional `clear()` method (not in `CacheStore` interface) for
  test convenience.

All methods are async (return Promises) to conform to the `CacheStore`
interface, even though the underlying `Map` operations are synchronous.

---

## BrowserCache

`BrowserCache` in `lib/browser-cache.ts` implements `CacheStore` using
IndexedDB:

- **Database:** Opens `soda3js-cache` (configurable via `dbName`) at version 1
- **Object store:** `responses` with `key` as keyPath
- **Indexes:** `domain`, `datasetId`, `created`, `cleanable` for query support
- **Connection lifecycle:** Opens and closes the database for each operation.
  This prevents stale connections and works correctly with browser tab
  lifecycle events.

The `StoredEntry` type extends `CacheEntry` with a `key` field (required by
IndexedDB's keyPath). The `get()` method strips the `key` before returning
to maintain the `CacheEntry` contract.

Prune reads all entries, filters client-side (IndexedDB has no
`DELETE WHERE` equivalent), then batch-deletes matching keys in a single
readwrite transaction.

---

## Subpath Export Strategy

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./browser": "./src/browser.ts"
  }
}
```

- `"."` exports: `buildCacheKey`, `MemoryCache`, `MemoryCacheOptions`, and
  all protocol cache types (re-exported for convenience)
- `"./browser"` exports: everything from `"."` plus `BrowserCache` and
  `BrowserCacheOptions`

The `rslib-builder` rewrites these paths to built artifacts at publish time.

---

## Dependency Model

| Dependency | Purpose |
| --- | --- |
| `@soda3js/protocol` | `CacheStore` interface and cache types |

Dev dependencies include `fake-indexeddb` for testing `BrowserCache` in Node.

---

## Testing Strategy

- **buildCacheKey:** Verify deterministic output, null byte separation,
  optional field handling, SHA-256 vs FNV-1a path coverage
- **MemoryCache:** get/set/has/invalidate, LRU eviction at maxEntries,
  prune by maxAge, cleanableOnly filtering
- **BrowserCache:** Same CacheStore contract tests using `fake-indexeddb`,
  IndexedDB open/close lifecycle, prune batch deletion

---

## Future Work

- Add `maxSize` pruning (evict until total bytes are under a threshold)
- Consider a Web Crypto API path for `buildCacheKey` in browsers (instead
  of FNV-1a fallback)
- Add cache statistics (hit/miss counters) as an optional extension
- Consider entry-level TTL expiry checks in `get()` (currently consumer
  responsibility)

---

## Client Integration

The `@soda3js/cache` package's `buildCacheKey()` function is used by the
client package's `utils/cache.ts` module. The client prepends
`{domain}/{datasetId}/` to the hash returned by `buildCacheKey()`, creating
hierarchical path-like keys that the filesystem cache backend uses for
directory routing. This key format is consumed by all `CacheStore`
implementations.

The `MemoryCache` and `BrowserCache` implementations in this package work
with these path-like keys without modification -- the key is treated as an
opaque string by these backends. The hierarchical structure is only
meaningful to `@soda3js/cache-fs`, which parses the key to determine
directory placement.

---

**Document Status:** Current -- all planned cache functionality implemented
and integrated with `@soda3js/client` on `feat/caching` branch.

**Next Update:** When cache statistics or entry-level TTL expiry is added.
