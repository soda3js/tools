---
"@soda3js/cli": minor
---

## Features

### Response caching

- FileSystemCache enabled by default with 5-minute TTL
- TOML config `[cache]` section with `enabled` and `ttl` fields, plus per-profile overrides under `[profiles.X.cache]`
- `--no-cache` flag disables caching for a single invocation
- `--cache-ttl` flag overrides TTL for a single invocation

### Cache management commands

- `soda3 cache status` -- show cache info
- `soda3 cache inspect <dataset-id>` -- display freshness state and cached queries with SoQL, size, and age
- `soda3 cache clear` -- wipe cached data (supports `--profile` and `--dataset` scoping)
- `soda3 cache prune` -- remove stale entries (supports `--max-age` duration like `7d`, `24h`)

### Aggregate query support

- `--group-by` flag accepts comma-separated columns for GROUP BY clauses
- `--select` now handles function expressions like `count(*)` and `sum(amount)` by wrapping them with SoQL.raw()
