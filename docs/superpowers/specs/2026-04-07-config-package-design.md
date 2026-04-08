# @soda3js/config — Design Spec

## Purpose

Centralize XDG Base Directory resolution, TOML config loading, and config
schema generation into a shared package. Eliminates duplicated path logic
across CLI, MCP, cache-fs, and cache-sqlite. Provides a `Soda3Config` class
with static XDG methods, immutable config instances, and Effect Schema
definitions that generate a JSON Schema for Tombi TOML IDE support.

## Problem

- MCP hardcodes `~/.config/soda3js/config.toml` — ignores `XDG_CONFIG_HOME`
- CLI and MCP each implement config loading independently with divergent
  error handling, sync/async APIs, and type definitions
- cache-fs and cache-sqlite each have identical `xdg.ts` files
- No machine-readable schema for the config TOML file

## Package Metadata

- Name: `@soda3js/config`
- Published: yes (in fixed version group with all other packages)
- Runtime deps: `effect`, `smol-toml`
- Peer deps: none
- Internal deps: none (leaf package alongside soql and protocol)

## Soda3Config Class

Static methods for XDG directory resolution (no instance needed) and
factory methods that return immutable config instances.

### Static: XDG Directories

All methods return `{XDG_VAR}/soda3js` when the env var is set, otherwise
the POSIX fallback path. App name is `soda3js` throughout.

```text
Soda3Config.configDir()   -> XDG_CONFIG_HOME/soda3js  || ~/.config/soda3js
Soda3Config.cacheDir()    -> XDG_CACHE_HOME/soda3js   || ~/.cache/soda3js
Soda3Config.stateDir()    -> XDG_STATE_HOME/soda3js   || ~/.local/state/soda3js
Soda3Config.dataDir()     -> XDG_DATA_HOME/soda3js    || ~/.local/share/soda3js
Soda3Config.runtimeDir()  -> XDG_RUNTIME_DIR/soda3js  (undefined if env var unset)
Soda3Config.configPath()  -> configDir()/config.toml
```

`runtimeDir()` returns `string | undefined` because the XDG spec says
`XDG_RUNTIME_DIR` has no default — it must be set by the login system.

### Static: Factories

```typescript
// Async — reads TOML file, returns loaded instance
static load(path?: string): Promise<Soda3Config>

// Sync — same but synchronous (for MCP stdio startup)
static loadSync(path?: string): Soda3Config

// Returns instance with default empty state
static empty(): Soda3Config
```

`load` and `loadSync` return `Soda3Config.empty()` when the file does not
exist (ENOENT). Parse errors propagate as exceptions.

### Instance: Readonly State

```typescript
readonly profiles: Record<string, Profile>
readonly defaultProfile: string | undefined
readonly format: string | undefined
readonly cache: CacheConfig | undefined
```

### Instance: Immutable Operations

All mutation methods return a new `Soda3Config` instance.

```typescript
getProfile(name: string): Profile | undefined
listProfiles(): string[]
withProfile(name: string, profile: Profile): Soda3Config
withDefault(name: string): Soda3Config
withFormat(format: string): Soda3Config
withCache(cache: CacheConfig): Soda3Config
```

### Instance: Serialization

```typescript
// Writes TOML to disk, creating parent dirs
save(path?: string): Promise<void>

// Returns TOML string without writing
toTOML(): string
```

## Config Types

### Profile

```typescript
interface Profile {
  readonly domain: string
  readonly token?: string
  readonly cache?: CacheConfig
}
```

### CacheConfig

```typescript
interface CacheConfig {
  readonly enabled?: boolean
  readonly ttl?: number
}
```

### Config (internal TOML shape)

```typescript
interface ConfigShape {
  format?: string
  default_profile?: string
  cache?: CacheConfig
  profiles: Record<string, Profile>
}
```

## Effect Schema Definitions

Config types are defined as Effect Schemas with `.annotations()` for
JSON Schema metadata. These serve dual purpose: runtime validation
and JSON Schema generation.

```typescript
// packages/config/src/schemas/config.ts
import { Schema } from "effect";

export const CacheConfigSchema = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean).annotations({
    description: "Enable response caching",
  }),
  ttl: Schema.optional(Schema.Number).annotations({
    description: "Cache time-to-live in seconds",
  }),
}).annotations({
  identifier: "CacheConfig",
  description: "Cache behavior settings",
});

export const ProfileSchema = Schema.Struct({
  domain: Schema.String.annotations({
    description: "Socrata portal domain (e.g. data.sfgov.org)",
  }),
  token: Schema.optional(Schema.String).annotations({
    description: "Socrata app token for this portal",
  }),
  cache: Schema.optional(CacheConfigSchema).annotations({
    description: "Per-profile cache override",
  }),
}).annotations({
  identifier: "Profile",
  description: "Named portal configuration",
});

export const ConfigSchema = Schema.Struct({
  format: Schema.optional(Schema.String).annotations({
    description: "Default output format (table, json, ndjson, csv)",
  }),
  default_profile: Schema.optional(Schema.String).annotations({
    description: "Name of the active profile",
  }),
  cache: Schema.optional(CacheConfigSchema).annotations({
    description: "Global cache settings",
  }),
  profiles: Schema.Record({
    key: Schema.String,
    value: ProfileSchema,
  }).annotations({
    description: "Named portal profiles",
  }),
}).annotations({
  identifier: "Soda3Config",
  title: "Soda3Config",
  description: "Configuration file for soda3js tools",
});
```

TypeScript types are extracted from schemas:

```typescript
export type CacheConfig = typeof CacheConfigSchema.Type;
export type Profile = typeof ProfileSchema.Type;
export type Config = typeof ConfigSchema.Type;
```

### Cache File Schemas

`packages/config/src/schemas/cache.ts` defines Effect Schema equivalents
of the `@soda3js/protocol` cache interfaces, annotated for JSON Schema
generation. These mirror the on-disk file formats.

```typescript
// packages/config/src/schemas/cache.ts
import { Schema } from "effect";

export const DatasetFreshnessSchema = Schema.Struct({
  domain: Schema.String.annotations({ description: "Socrata portal domain" }),
  datasetId: Schema.String.annotations({ description: "Dataset identifier" }),
  rowsUpdatedAt: Schema.Number.annotations({ description: "Unix timestamp of last data update" }),
  lastChecked: Schema.String.annotations({ description: "ISO 8601 timestamp of last freshness check" }),
  ttl: Schema.Number.annotations({ description: "Time-to-live in seconds" }),
}).annotations({
  identifier: "DatasetFreshness",
  title: "DatasetFreshness",
  description: "Tracks when a dataset was last checked for freshness (_freshness.json)",
});

export const CacheEntryMetaSchema = Schema.Struct({
  key: Schema.String.annotations({ description: "Cache key hash" }),
  path: Schema.String.annotations({ description: "Relative path to cached response body" }),
  contentType: Schema.String.annotations({ description: "MIME type of cached response" }),
  created: Schema.String.annotations({ description: "ISO 8601 timestamp when entry was cached" }),
  datasetId: Schema.String.annotations({ description: "Dataset identifier" }),
  domain: Schema.String.annotations({ description: "Socrata portal domain" }),
  rowsUpdatedAt: Schema.Number.annotations({ description: "Unix timestamp of dataset version" }),
  sizeBytes: Schema.Number.annotations({ description: "Size of cached response body in bytes" }),
  ttl: Schema.Number.annotations({ description: "Time-to-live in seconds" }),
  cleanable: Schema.Boolean.annotations({ description: "Whether this entry can be pruned" }),
  query: Schema.optional(Schema.String).annotations({ description: "SoQL query string that produced this response" }),
}).annotations({
  identifier: "CacheEntryMeta",
  title: "CacheEntryMeta",
  description: "Metadata sidecar for a cached API response (*.meta.json)",
});
```

## JSON Schema Generation

### Script

`packages/config/lib/scripts/generate-json-schema.ts`:

```typescript
import { JSONSchema } from "effect";
import { ConfigSchema } from "../../src/schemas/config.js";
import { CacheEntryMetaSchema, DatasetFreshnessSchema } from "../../src/schemas/cache.js";

const SCHEMAS_DIR = resolve(import.meta.dirname, "../../../website/public/schemas");

const schemas = [
  { name: "config.json", schema: ConfigSchema },
  { name: "cache-entry.json", schema: CacheEntryMetaSchema },
  { name: "freshness.json", schema: DatasetFreshnessSchema },
];

for (const { name, schema } of schemas) {
  const json = JSONSchema.make(schema);
  // Smart diff: only write if changed (prevents turbo cache busting)
  writeIfChanged(join(SCHEMAS_DIR, name), JSON.stringify(json, null, "\t"));
}
```

### Turbo Integration

`packages/config/turbo.json`:

```json
{
  "extends": ["//"],
  "tasks": {
    "generate:json-schema": {
      "cache": true,
      "inputs": [
        "lib/scripts/generate-json-schema.ts",
        "src/schemas/config.ts",
        "src/schemas/cache.ts"
      ],
      "outputLogs": "new-only",
      "outputs": [
        "$TURBO_ROOT$/website/public/schemas/config.json",
        "$TURBO_ROOT$/website/public/schemas/cache-entry.json",
        "$TURBO_ROOT$/website/public/schemas/freshness.json"
      ]
    },
    "types:check": {
      "dependsOn": ["generate:json-schema"]
    }
  }
}
```

Output goes to `website/public/schemas/` so they are served at
`https://soda3js.tools/schemas/{name}.json` by the RSPress site.

### Tombi Integration

Users add to their Tombi config (`.tombi.toml` or VS Code settings):

```toml
[schemas]
"https://soda3js.tools/schemas/config.json" = "config.toml"
```

### Cache File Schemas

The generation script also produces schemas for cache metadata files
from the existing `@soda3js/protocol` types. These help AI agents
understand cache file structures when browsing the filesystem.

Schemas generated:

| File | Source Type | URL |
| --- | --- | --- |
| `config.json` | `ConfigSchema` from config package | `https://soda3js.tools/schemas/config.json` |
| `cache-entry.json` | `CacheEntry` from protocol (minus `body`) | `https://soda3js.tools/schemas/cache-entry.json` |
| `freshness.json` | `DatasetFreshness` from protocol | `https://soda3js.tools/schemas/freshness.json` |

The `CacheEntry` on-disk representation (`.meta.json` files) omits the
`body` field since the binary payload is stored in a separate file. The
schema reflects this on-disk shape, not the in-memory interface.

The `CacheEntry` and `DatasetFreshness` interfaces live in `@soda3js/protocol`
as plain TypeScript interfaces today. The generation script defines
Effect Schema equivalents locally (annotated for JSON Schema metadata)
that mirror these protocol types. This avoids adding Effect as a
dependency to the zero-dep protocol package.

## Package Structure

```text
packages/config/
  package.json
  rslib.config.ts
  tsconfig.json
  turbo.json
  src/
    index.ts                   # re-exports Soda3Config, types, schemas
    lib/
      soda3-config.ts          # Soda3Config class implementation
      xdg.ts                   # static XDG methods (used by class)
    schemas/
      config.ts                # Effect Schema: Config, Profile, CacheConfig
      cache.ts                 # Effect Schema: CacheEntryMeta, DatasetFreshness
  lib/
    scripts/
      generate-json-schema.ts  # generates all schemas to website/public/schemas/
  __test__/
    lib/
      soda3-config.test.ts     # load, save, immutable ops
      xdg.test.ts              # XDG env var resolution
    schemas/
      config.test.ts           # Schema validation tests
```

## Exports

```typescript
// Class
export { Soda3Config } from "./lib/soda3-config.js";

// Types (extracted from schemas)
export type { CacheConfig, Config, Profile } from "./schemas/config.js";

// Schemas (for consumers who need runtime validation or JSON Schema)
export { CacheConfigSchema, ConfigSchema, ProfileSchema } from "./schemas/config.js";
```

## Migration Plan

### CLI (packages/cli)

- Delete `src/lib/config-store.ts`
- Replace all imports with `import { Soda3Config } from "@soda3js/config"`
- Update `config.ts` commands to use `Soda3Config.load()`, `.withProfile()`, `.save()`
- Update `cache-factory.ts` and command files that call `configPath()` or `readConfig()`
- Add `@soda3js/config` as dependency

### MCP (packages/mcp)

- Delete `src/lib/config.ts`
- Replace with `Soda3Config.loadSync()` in `src/index.ts`
- Derive `McpConfig` from the loaded `Soda3Config` instance plus env var overrides
- Add `@soda3js/config` as dependency

### cache-fs (packages/cache-fs)

- Delete `src/lib/xdg.ts`
- Replace `import { cacheDir, stateDir } from "./xdg.js"` with
  `import { Soda3Config } from "@soda3js/config"`
  and use `Soda3Config.cacheDir()`, `Soda3Config.stateDir()`
- Move xdg tests to the config package
- Add `@soda3js/config` as dependency

### cache-sqlite (packages/cache-sqlite)

- Delete `src/lib/xdg.ts`
- Replace `import { cacheDir } from "./xdg.js"` with `Soda3Config.cacheDir()`
- Add `@soda3js/config` as dependency

### Changeset config

- Add `@soda3js/config` to `.changeset/config.json` fixed version group

## Testing

### XDG Resolution

- Each XDG method respects its env var when set
- Each XDG method falls back to POSIX default when unset
- `runtimeDir()` returns undefined when `XDG_RUNTIME_DIR` is unset
- App name is `soda3js` in all paths

### Config Loading

- `load()` reads and parses valid TOML
- `load()` returns empty config on ENOENT
- `load()` throws on TOML parse error
- `loadSync()` mirrors async behavior
- Custom path overrides default

### Immutable Operations

- `withProfile()` returns new instance without mutating original
- `withDefault()` sets `defaultProfile`
- `getProfile()` returns profile or undefined
- `listProfiles()` returns all names

### Serialization

- `toTOML()` round-trips through parse
- `save()` creates parent directories
- Optional fields omitted when undefined

### Schema Validation

- `ConfigSchema` accepts valid config objects
- `ConfigSchema` rejects invalid shapes (missing domain, wrong types)
- `ProfileSchema` validates individual profiles
- Generated JSON Schema matches expected structure
