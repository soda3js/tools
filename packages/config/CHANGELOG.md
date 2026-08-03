# @soda3js/config

## 0.1.0

### Features

* ### Shared Configuration Package

  New `@soda3js/config` package centralizing XDG Base Directory resolution and TOML config loading across all soda3js tools.

  * `Soda3Config` class with static XDG methods (`configDir`, `cacheDir`, `stateDir`, `dataDir`, `runtimeDir`)
  * Async `load()` and sync `loadSync()` factories for reading `config.toml`
  * Immutable builders: `withProfile()`, `withDefault()`, `withFormat()`, `withCache()`
  * `toTOML()` serialization and `save()` for writing config

  ### Effect Schemas and JSON Schema Generation

  * `ConfigSchema`, `ProfileSchema`, `CacheConfigSchema` for config file validation
  * `CacheEntryMetaSchema`, `DatasetFreshnessSchema` for cache file validation
  * JSON Schema generation script outputs to `website/public/schemas/` for Tombi IDE support and AI agent consumption [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#56]: https://github.com/soda3js/tools/pull/56
