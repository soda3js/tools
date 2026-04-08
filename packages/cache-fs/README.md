# @soda3js/cache-fs

Filesystem-backed response cache for the [Socrata SODA3 API](https://dev.socrata.com/). Stores cached responses in XDG-compliant directories with sidecar metadata files.

## Install

```bash
npm install @soda3js/cache-fs effect @effect/platform
```

`effect` and `@effect/platform` are peer dependencies.

## Quick Start

### Standalone (without Effect)

```typescript
import { FileSystemCacheImpl, cacheDir } from "@soda3js/cache-fs";
import { Soda3Client } from "@soda3js/rest/node";

const cache = new FileSystemCacheImpl({ cacheDir: cacheDir() });

const client = new Soda3Client({
  domain: "data.sfgov.org",
  appToken: process.env.SOCRATA_APP_TOKEN,
  cache,
  cacheTtl: 300,
});
```

### As an Effect Layer

```typescript
import { FileSystemCache, FileSystemCacheLive } from "@soda3js/cache-fs";
import { Layer } from "effect";

const cacheLayer = FileSystemCacheLive({
  defaultTtl: 300,
});
```

## Cache Directory

Cache files are stored under the XDG cache directory:

- Linux / macOS: `~/.cache/soda3js/`
- Custom: set `XDG_CACHE_HOME` environment variable

Directory layout:

```text
~/.cache/soda3js/
  data.sfgov.org/
    yitu-d5am/
      _freshness.json
      _metadata.json
      queries/
        a1b2c3d4.json
        a1b2c3d4.meta.json
```

## API

### FileSystemCacheImpl

Direct `CacheStore` implementation for use without Effect.

```typescript
import { FileSystemCacheImpl } from "@soda3js/cache-fs";

const cache = new FileSystemCacheImpl({
  cacheDir: "/path/to/cache",
  defaultTtl: 600,
});
```

### FileSystemCache / FileSystemCacheLive

Effect Context Tag and Layer for dependency injection.

```typescript
import { FileSystemCache, FileSystemCacheLive } from "@soda3js/cache-fs";

const layer = FileSystemCacheLive({ defaultTtl: 300 });
```

### Helpers

```typescript
import { cacheDir, stateDir } from "@soda3js/cache-fs";

cacheDir(); // ~/.cache/soda3js
stateDir(); // ~/.local/state/soda3js
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cacheDir` | `string` | XDG cache dir | Root directory for cache files |
| `defaultTtl` | `number` | `300` | Default TTL in seconds |

## License

[MIT](./LICENSE)
