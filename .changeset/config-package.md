---
"@soda3js/config": minor
---

## Features

### Shared Configuration Package

New `@soda3js/config` package centralizing XDG Base Directory resolution and TOML config loading across all soda3js tools.

- `Soda3Config` class with static XDG methods (`configDir`, `cacheDir`, `stateDir`, `dataDir`, `runtimeDir`)
- Async `load()` and sync `loadSync()` factories for reading `config.toml`
- Immutable builders: `withProfile()`, `withDefault()`, `withFormat()`, `withCache()`
- `toTOML()` serialization and `save()` for writing config

### Effect Schemas and JSON Schema Generation

- `ConfigSchema`, `ProfileSchema`, `CacheConfigSchema` for config file validation
- `CacheEntryMetaSchema`, `DatasetFreshnessSchema` for cache file validation
- JSON Schema generation script outputs to `website/public/schemas/` for Tombi IDE support and AI agent consumption
