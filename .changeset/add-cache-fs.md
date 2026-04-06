---
"@soda3js/cache-fs": minor
---

## Features

### Adds @soda3js/cache-fs Package

Persistent filesystem cache using the XDG Base Directory spec with hierarchical domain/dataset storage.

### Hierarchical directory layout

Cached responses are organized as `domain/dataset/queries/hash.json` with `.meta.json` sidecars containing the original SoQL query, timestamps, and size. Dataset-level `_freshness.json` and `_metadata.json` files track freshness lifecycle and column metadata. No centralized index file -- the filesystem structure is the index.

### Effect Layer integration

`FileSystemCache` Effect Context.Tag with `FileSystemCacheLive` Layer. Platform entry points at `@soda3js/cache-fs/node` and `@soda3js/cache-fs/bun`. Defaults to XDG-compliant cache directory (`$XDG_CACHE_HOME/soda3js`).
