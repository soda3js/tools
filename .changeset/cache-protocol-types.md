---
"@soda3js/protocol": minor
---

## Features

### Cache store interface and types

- `CacheStore` -- async key-value interface (`get`, `set`, `has`, `invalidate`, `prune`) for pluggable cache backends
- `CacheEntry` -- stored response shape with body, content type, headers, freshness metadata, and optional query string
- `CacheKeyInput`, `PruneOptions`, `PruneResult`, `DatasetFreshness` -- supporting types for key construction, pruning, and freshness tracking
