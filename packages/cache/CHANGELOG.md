# @soda3js/cache

## 0.1.0

### Features

* ### Adds @soda3js/cache Package

  Zero-dependency response caching for the Socrata SODA3 API with two backends and a deterministic cache key builder.

  ### MemoryCache

  In-process LRU-evicting cache backed by a Map. Accepts `maxEntries` to cap memory use. Suitable for Node, Bun, server-side rendering, and testing.

  ### BrowserCache

  IndexedDB-backed cache with indexes on domain, datasetId, created, and cleanable. Available from the `@soda3js/cache/browser` subpath export. Accepts `dbName` and `version` options.

  ### buildCacheKey

  Deterministic SHA-256 cache key builder that produces path-like keys (`domain/datasetId/hash`). Falls back to FNV-1a in environments without `node:crypto`. Uses null byte separators to prevent concatenation collisions. [#55][#55]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/protocol | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55
