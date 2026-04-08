# @soda3js/config

[![npm version](https://img.shields.io/npm/v/@soda3js/config)](https://www.npmjs.com/package/@soda3js/config)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

XDG directory resolution, TOML configuration loading, and Effect Schema definitions for the soda3js toolkit. Shared by `@soda3js/cli` and `@soda3js/mcp`.

## Install

```bash
npm install @soda3js/config
```

## Quick Start

```typescript
import { Soda3Config } from "@soda3js/config";

// Load from ~/.config/soda3js/config.toml (or XDG_CONFIG_HOME)
const config = await Soda3Config.load();

// Read profiles
const sf = config.getProfile("sf");
console.log(sf?.domain); // "data.sfgov.org"

// Immutable builders -- each returns a new instance
const updated = config
  .withProfile("nyc", { domain: "data.cityofnewyork.us", token: "abc" })
  .withDefault("nyc")
  .withCache({ enabled: true, ttl: 300 });

// Save back to TOML
await updated.save();
```

## Soda3Config API

### Static Methods

| Method | Description |
| --- | --- |
| `Soda3Config.load(path?)` | Async load from TOML file (returns `empty()` if file missing) |
| `Soda3Config.loadSync(path?)` | Synchronous load from TOML file |
| `Soda3Config.empty()` | Empty config with no profiles |
| `Soda3Config.configDir()` | XDG config dir (`~/.config/soda3js`) |
| `Soda3Config.cacheDir()` | XDG cache dir (`~/.cache/soda3js`) |
| `Soda3Config.stateDir()` | XDG state dir (`~/.local/state/soda3js`) |
| `Soda3Config.dataDir()` | XDG data dir (`~/.local/share/soda3js`) |
| `Soda3Config.runtimeDir()` | XDG runtime dir (undefined if `XDG_RUNTIME_DIR` unset) |
| `Soda3Config.configPath()` | Full path to `config.toml` |

### Instance Properties

| Property | Type | Description |
| --- | --- | --- |
| `profiles` | `Record<string, Profile>` | Named portal profiles |
| `defaultProfile` | `string \| undefined` | Active profile name |
| `format` | `string \| undefined` | Default output format |
| `cache` | `CacheConfig \| undefined` | Global cache settings |

### Instance Methods

| Method | Returns | Description |
| --- | --- | --- |
| `getProfile(name)` | `Profile \| undefined` | Look up a profile |
| `listProfiles()` | `string[]` | All profile names |
| `withProfile(name, profile)` | `Soda3Config` | Add or replace a profile |
| `withDefault(name)` | `Soda3Config` | Set the default profile |
| `withFormat(format)` | `Soda3Config` | Set the default output format |
| `withCache(cache)` | `Soda3Config` | Set global cache settings |
| `toTOML()` | `string` | Serialize to TOML string |
| `save(path?)` | `Promise<void>` | Write TOML to disk |

## Types

```typescript
import type { Config, Profile, CacheConfig } from "@soda3js/config";
```

- **`Config`** -- Full configuration shape (profiles, default_profile, format, cache)
- **`Profile`** -- Named portal: `{ domain, token?, cache? }`
- **`CacheConfig`** -- Cache behavior: `{ enabled?, ttl? }`

## Effect Schemas

Effect Schema definitions for configuration validation and JSON Schema generation.

```typescript
import {
  ConfigSchema,
  ProfileSchema,
  CacheConfigSchema,
  CacheEntryMetaSchema,
  DatasetFreshnessSchema,
} from "@soda3js/config";
```

| Schema | Description |
| --- | --- |
| `ConfigSchema` | Full config.toml structure |
| `ProfileSchema` | Single portal profile |
| `CacheConfigSchema` | Cache behavior settings |
| `CacheEntryMetaSchema` | Sidecar metadata for a cached API response (`*.meta.json`) |
| `DatasetFreshnessSchema` | Dataset freshness tracking (`_freshness.json`) |

### JSON Schema Generation

The schemas are used to generate JSON Schema files for IDE support (Tombi TOML language server). Generated schemas are published at `soda3js.tools/schemas/`:

- `config.json` -- validates `config.toml`
- `cache-entry.json` -- validates cache sidecar files
- `freshness.json` -- validates freshness tracking files

```bash
pnpm --filter @soda3js/config generate:json-schema
```

## License

[MIT](./LICENSE)
