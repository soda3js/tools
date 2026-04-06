---
"@soda3js/client": minor
---

## Features

### Cache-aware endpoints

- `SodaClientConfig.withCache(config, cache, ttl?)` -- static factory that attaches a CacheStore instance and optional TTL to the client config
- When a CacheStore is provided, query and metadata endpoints check the cache before making HTTP requests
- TTL-gated metadata preflight: within TTL trusts cached rowsUpdatedAt, after TTL re-checks the metadata endpoint
- New `cachedQuery()`, `cachedMetadata()`, `getFreshness()`, `setFreshness()` utilities exported from the public API
