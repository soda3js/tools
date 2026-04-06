---
status: current
module: cache-fs
category: architecture
created: 2026-04-06
updated: 2026-04-06
last-synced: 2026-04-06
completeness: 90
related:
  - ../protocol/architecture.md
  - ../cache/architecture.md
  - ../cache-sqlite/architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/cache-fs - Architecture

Effect-based filesystem response cache for the Socrata SODA3 API. Uses a
hierarchical directory layout organized by domain and dataset, with sidecar
metadata files for query responses and convention files for freshness and
metadata. Follows XDG Base Directory conventions for cache paths.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Hierarchical Key Routing](#hierarchical-key-routing)
6. [FileSystemCacheImpl](#filesystemcacheimpl)
7. [FreshnessStore](#freshnessstore)
8. [XDG Path Resolution](#xdg-path-resolution)
9. [Effect Integration](#effect-integration)
10. [Subpath Export Strategy](#subpath-export-strategy)
11. [Dependency Model](#dependency-model)
12. [Testing Strategy](#testing-strategy)
13. [Future Work](#future-work)

---

## Overview

`@soda3js/cache-fs` provides a `CacheStore` implementation that persists
response bodies to the filesystem using a hierarchical directory structure
organized by domain and dataset. It is designed for CLI tools and long-running
Node/Bun processes where responses should survive process restarts without
requiring a database.

The package provides an Effect `Context.Tag` (`FileSystemCache`) and a
`Layer` factory (`FileSystemCacheLive`) for integration into Effect-based
applications. The underlying `FileSystemCacheImpl` class implements the
`CacheStore` interface from `@soda3js/protocol`.

Key design change from the initial implementation: the centralized JSON
index file (`index.json` + `IndexStore`) has been eliminated entirely.
Metadata is now stored inline alongside the data it describes, either as
sidecar `.meta.json` files (for query responses) or as convention-named
files (`_freshness.json`, `_metadata.json`) within the dataset directory.

---

## Current State

The package is implemented with five source files (down from seven after
removing the IndexStore):

```text
packages/cache-fs/src/
  index.ts              Main entry (FileSystemCache Tag, FileSystemCacheLive Layer)
  node.ts               Node.js re-export
  bun.ts                Bun re-export
  lib/
    fs-cache.ts         FileSystemCacheImpl (CacheStore implementation)
    freshness-store.ts  Per-domain dataset freshness file management
    xdg.ts              XDG Base Directory path resolution
```

The `lib/index-store.ts` file has been removed. All metadata is now stored
co-located with data files via the hierarchical directory layout.

---

## Rationale

### Why Filesystem Instead of SQLite

For CLI tools that run infrequently and cache a moderate number of responses
(tens to hundreds), a filesystem-based approach has advantages over SQLite:

- Zero native dependencies (no SQLite bindings to compile)
- Human-inspectable cache contents (individual body files)
- Simple backup and cleanup (`rm -rf ~/.cache/soda3js`)
- No database corruption risk from unclean shutdowns

For high-volume or concurrent-access scenarios, `@soda3js/cache-sqlite` is
the better choice.

### Why Hierarchical Directory Layout

The previous design used a flat `responses/` directory with hash-named files
and a central `index.json` for metadata lookups. The refactored design uses
a domain/dataset hierarchy:

- Human-navigable structure (browse by portal, then dataset)
- No centralized index to corrupt or lock
- Per-dataset isolation (one dataset's cache issues don't affect others)
- Natural grouping for the CLI `cache inspect` and `cache clear` commands
- Sidecar `.meta.json` files keep metadata co-located with body files

### Why Sidecar Metadata Instead of an Index

Query response metadata is stored in `{hash}.meta.json` files alongside
the `{hash}.json` body files. This eliminates the `IndexStore` entirely:

- No read-modify-write cycle on a shared index (no lock contention)
- Each entry is self-describing (sidecar contains all metadata)
- Prune walks the filesystem and reads individual sidecars
- The CLI `cache inspect` command reads sidecars directly

### Why Convention Files for Freshness and Metadata

Freshness records and cached metadata responses use fixed filenames
(`_freshness.json`, `_metadata.json`) rather than hashed keys with sidecars.
The underscore prefix distinguishes them from the `queries/` subdirectory:

- Only one freshness record per dataset (no hash needed)
- Only one metadata response per dataset (no hash needed)
- Simple path construction without key hashing
- Non-cleanable by prune (freshness) or separately managed (metadata)

### Why Effect Layers

The filesystem cache is designed for use in Effect-based applications (the
CLI, the client library). Providing a `Context.Tag` and `Layer` allows
consumers to compose the cache into their Effect dependency graph without
manual wiring. Non-Effect consumers can instantiate `FileSystemCacheImpl`
directly, but the primary integration path is through the Layer.

### Why XDG Conventions

Following XDG Base Directory conventions (`XDG_CACHE_HOME`) means the cache
respects user configuration, integrates with system cleanup tools, and avoids
polluting the home directory with dotfiles. Cache data goes to
`~/.cache/soda3js/`.

---

## System Architecture

```text
FileSystemCacheLive (Layer factory)
  |
  v
FileSystemCache (Context.Tag)
  |
  v
FileSystemCacheImpl (CacheStore)
  |
  +-- classifyKey(key) -> KeyType routing
  |     |
  |     +-- "freshness" -> domain/dataset/_freshness.json
  |     +-- "query"     -> domain/dataset/queries/{hash}.json + .meta.json
  |     +-- metadata    -> domain/dataset/_metadata.json (via entry.query)
  |
  +-- FreshnessStore (legacy, retained for Layer integration)
  |
  +-- XDG (path resolution)
        |
        +-- cacheDir() -> ~/.cache/soda3js
```

---

## Hierarchical Key Routing

`FileSystemCacheImpl` uses a `classifyKey()` function to parse incoming
cache keys and route operations to the appropriate file paths:

### Key Format: `__freshness__/{domain}/{datasetId}`

Freshness keys are generated by the client's `utils/cache.ts` module using
the `FRESHNESS_KEY_PREFIX`. The `classifyKey` function strips the prefix and
extracts domain and datasetId.

Storage: `{cacheDir}/{domain}/{datasetId}/_freshness.json` (body only, no
sidecar). Freshness entries are marked `cleanable: false` and are not
affected by prune operations.

### Key Format: `{domain}/{datasetId}/{hash}`

Regular cache keys (query responses and metadata) use a path-like format.
The `buildCacheKey()` function from `@soda3js/cache` generates the hash
portion; the client's `cachedQuery` and `cachedMetadata` functions prepend
the domain and dataset segments.

For **query responses**, storage uses the `queries/` subdirectory:

- Body: `{cacheDir}/{domain}/{datasetId}/queries/{hash}.json`
- Sidecar: `{cacheDir}/{domain}/{datasetId}/queries/{hash}.meta.json`

For **metadata responses** (detected via `entry.query === "__metadata__"`),
storage uses a convention file:

- Body: `{cacheDir}/{domain}/{datasetId}/_metadata.json` (no sidecar)

### File Layout on Disk

```text
~/.cache/soda3js/
  data.cityofchicago.org/
    abcd-1234/
      _freshness.json              # Dataset freshness record
      _metadata.json               # Cached metadata response
      queries/
        a1b2c3d4e5f67890.json      # Query response body
        a1b2c3d4e5f67890.meta.json # Query sidecar metadata
        f0e9d8c7b6a54321.json      # Another query response
        f0e9d8c7b6a54321.meta.json # Its sidecar metadata
  data.seattle.gov/
    wxyz-9876/
      _freshness.json
      queries/
        ...
```

### Sidecar Metadata Format

Each `.meta.json` sidecar contains a `SidecarMeta` object:

```typescript
interface SidecarMeta {
  key: string;         // The hash portion of the cache key
  path: string;        // Relative path to the body file
  query?: string;      // Original SoQL query string (from CacheEntry.query)
  contentType: string;
  created: string;
  datasetId: string;
  domain: string;
  rowsUpdatedAt: number;
  sizeBytes: number;
  ttl: number;
  cleanable: boolean;
}
```

The optional `query` field is populated from `CacheEntry.query` and enables
the CLI `cache inspect` command to display human-readable query descriptions.

### Content Type to Extension Mapping

| Content Type | Extension |
| --- | --- |
| `*geo+json*` | `.geojson` |
| `*json*` | `.json` |
| `*csv*` | `.csv` |
| (default) | `.bin` |

---

## FileSystemCacheImpl

The core class in `lib/fs-cache.ts` implements all five `CacheStore` methods
using the hierarchical key routing system:

- **get(key):** Calls `classifyKey()`, then reads from the appropriate
  location. For freshness keys, reads `_freshness.json`. For query keys,
  reads the sidecar `.meta.json` to get metadata, then reads the body file.
  Falls back to trying `_metadata.json` for metadata cache entries. Returns
  `undefined` if files are missing.

- **set(key, entry):** Calls `classifyKey()`, creates the directory structure
  with `mkdir -p`, then writes files. Freshness entries go to
  `_freshness.json`. Metadata entries (detected via `entry.query ===
  "__metadata__"`) go to `_metadata.json`. Query entries write both a body
  file and a `.meta.json` sidecar in the `queries/` subdirectory.

- **has(key):** Checks file existence via `access()` without reading content.
  For query keys, checks the sidecar existence. Falls back to checking
  `_metadata.json`.

- **invalidate(key):** Removes the body file and sidecar (for query entries)
  or the convention file (for freshness/metadata entries). Uses `force: true`
  to handle already-deleted files.

- **prune(options):** Walks the hierarchical directory structure:
  `cacheDir -> domain dirs -> dataset dirs -> queries/ dir -> .meta.json
  files`. Reads each sidecar, checks age against `maxAge`, respects
  `cleanableOnly`, and removes matching body + sidecar pairs. Returns
  aggregate `removed` count and `freedBytes`.

---

## FreshnessStore

`lib/freshness-store.ts` manages per-domain dataset freshness records.
This module is retained for the Layer integration path but freshness is now
primarily managed through the `CacheStore` interface using
`__freshness__/`-prefixed keys (driven by the client's `utils/cache.ts`).

Freshness records track when a dataset's `rowsUpdatedAt` was last checked,
enabling smart cache invalidation without re-fetching metadata on every
request.

---

## XDG Path Resolution

`lib/xdg.ts` resolves paths following XDG Base Directory conventions:

- **cacheDir():** `$XDG_CACHE_HOME/soda3js` or `~/.cache/soda3js`

These functions are exported from the package for use by consumers who need
to inspect or clean the cache directory. The `stateDir()` function is no
longer needed since the centralized index was eliminated; all state now
lives within the cache directory hierarchy.

---

## Effect Integration

The package provides an Effect `Context.Tag` and `Layer`:

- **FileSystemCache:** `Context.Tag("@soda3js/cache-fs/FileSystemCache")`
  typed as `CacheStore`. Consumers depend on this tag in their Effect
  programs.

- **FileSystemCacheLive(options?):** Layer factory that creates a
  `FileSystemCacheImpl` with resolved XDG paths. Accepts optional overrides
  for `cacheDir` and `defaultTtl`.

The Layer uses `Layer.succeed` (not `Layer.effect`) because
`FileSystemCacheImpl` construction is synchronous -- actual filesystem
operations happen lazily when methods are called.

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

- `"."` exports: `FileSystemCache`, `FileSystemCacheLive`, `cacheDir`,
  protocol cache types, and `FileSystemCacheOptions`
- `"./node"` and `"./bun"` re-export everything from `"."`. Currently
  identical because `FileSystemCacheImpl` uses `node:fs/promises` and
  `node:path` which are available in both Node and Bun.

The separate entry points exist for future platform-specific optimizations
(e.g., Bun's native filesystem APIs) and for consistency with the rest and
cache-sqlite packages.

---

## Dependency Model

| Dependency | Type | Purpose |
| --- | --- | --- |
| `@soda3js/protocol` | fixed | `CacheStore` interface and cache types |
| `effect` | peer | Effect runtime, Context.Tag, Layer |
| `@effect/platform` | peer | Platform abstractions |
| `@effect/platform-node` | peer (optional) | Node platform layer |

The package uses `node:fs/promises`, `node:path`, and `node:os` from the
Node standard library. These are available in both Node and Bun without
additional dependencies.

---

## Testing Strategy

- **FileSystemCacheImpl:** Full CacheStore contract tests using temp
  directories. get/set/has/invalidate/prune with real filesystem operations.
  Tests cover the hierarchical directory layout, sidecar metadata,
  freshness key routing, metadata key routing, and prune walking.
- **FreshnessStore:** Unit tests for loadFreshness/saveFreshness with temp
  directories.
- **XDG:** Unit tests with mocked environment variables.

---

## Future Work

- Add file locking for concurrent access safety (multiple CLI processes)
- Add `maxSize` pruning (evict until total cache size is under a threshold)
- Consider Bun-native filesystem APIs for the `./bun` entry point
- Add cache directory size reporting utility
- Consider atomic writes (write to temp file, rename) for crash safety

---

**Document Status:** Current -- hierarchical directory layout with sidecar
metadata implemented. Index store eliminated. Integrated with
`@soda3js/client` cache utilities on `feat/caching` branch.

**Next Update:** When file locking or maxSize pruning is added.
