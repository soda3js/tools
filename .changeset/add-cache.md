---
"@soda3js/cache": minor
---

## Features

### Adds @soda3js/cache Package

Zero-dependency response caching for the Socrata SODA3 API with two backends and a deterministic cache key builder.

### MemoryCache

In-process LRU-evicting cache backed by a Map. Accepts `maxEntries` to cap memory use. Suitable for Node, Bun, server-side rendering, and testing.

### BrowserCache

IndexedDB-backed cache with indexes on domain, datasetId, created, and cleanable. Available from the `@soda3js/cache/browser` subpath export. Accepts `dbName` and `version` options.

### buildCacheKey

Deterministic SHA-256 cache key builder that produces path-like keys (`domain/datasetId/hash`). Falls back to FNV-1a in environments without `node:crypto`. Uses null byte separators to prevent concatenation collisions.
