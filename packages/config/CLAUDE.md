# @soda3js/config

Shared configuration package for the soda3js toolkit. Provides XDG
Base Directory resolution, TOML config file loading/saving, and typed
configuration schemas. Used by `@soda3js/cli` and `@soda3js/mcp`.

## Architecture

- `lib/xdg.ts` -- XDG Base Directory functions: `configDir()`,
  `cacheDir()`, `stateDir()`, `dataDir()`, `runtimeDir()`, `configPath()`
  All resolve under the `soda3js` app name.
- `lib/soda3-config.ts` -- `Soda3Config` class: immutable config
  object with static factories (`load`, `loadSync`, `empty`),
  instance builders (`withProfile`, `withDefault`, `withFormat`,
  `withCache`), TOML serialization (`toTOML`, `save`), and
  static XDG directory accessors
- `schemas/config.ts` -- TypeScript types: `Config`, `Profile`,
  `CacheConfig`; plus matching schema constants
- `schemas/cache.ts` -- Cache metadata types: `CacheEntryMeta`,
  `DatasetFreshness`; plus matching schema constants

## Config File

Default path: `~/.config/soda3js/config.toml` (or `$XDG_CONFIG_HOME/soda3js/config.toml`)

```toml
format = "table"
default_profile = "chicago"

[cache]
enabled = true
ttl = 300

[profiles.chicago]
domain = "data.cityofchicago.org"
token = "your-app-token"
```

## Key Patterns

- **Immutable builders:** Every `with*` method returns a new `Soda3Config`
  instance. Never mutates in place.
- **Sync and async loading:** `loadSync()` for CLI/MCP startup,
  `load()` for async contexts. Both return `Soda3Config.empty()` on
  missing file (ENOENT).
- **TOML round-trip:** `fromTOML` (private) parses, `toTOML()` serializes.
  Uses `smol-toml` for parsing and stringification.
- **XDG compliance:** All directory functions respect `XDG_*` env vars
  with standard fallbacks (`~/.config`, `~/.cache`, etc.)

## Dependencies

Runtime: `effect`, `smol-toml`. No peer deps.

## Consumers

- `@soda3js/cli` -- loads config for profile resolution, cache settings
- `@soda3js/mcp` -- loads config via `Soda3Config.loadSync()` at startup
- `@soda3js/cache-fs` and `@soda3js/cache-sqlite` -- use `Soda3Config`
  for XDG cache directory resolution

## Testing

Tests in `__test__/`. Run: `pnpm test` from repo root.
