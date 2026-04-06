---
"@soda3js/rest": minor
---

## Features

### Optional caching support

- `Soda3ClientConfig` accepts optional `cache` (CacheStore) and `cacheTtl` (number) fields
- When provided, query and metadata calls use cache-aware endpoints from the client layer
- No default cache -- consumers opt in by passing a MemoryCache, BrowserCache, FileSystemCache, or any custom CacheStore implementation
