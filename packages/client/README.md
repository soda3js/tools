# @soda3js/client

Platform-agnostic [Effect](https://effect.website/) service library for the [Socrata SODA3 API](https://dev.socrata.com/). Provides typed queries, streaming pagination, metadata discovery, and structured error handling through Effect's service pattern.

If you want a simpler Promise-based API without Effect, use [`@soda3js/rest`](../rest/) instead.

## Install

```bash
npm install @soda3js/client effect @effect/platform
```

`effect` and `@effect/platform` are peer dependencies.

## Quick Start

```typescript
import { NodeHttpClient } from "@effect/platform-node";
import { SoQL, SodaClient, SodaClientConfig, SodaClientLive } from "@soda3js/client";
import { Effect, Layer } from "effect";

// 1. Build the layer
const config = new SodaClientConfig({
  appToken: process.env.SOCRATA_APP_TOKEN,
});
const layer = SodaClientLive(config).pipe(
  Layer.provide(NodeHttpClient.layerUndici),
);

// 2. Query SF film locations
const program = Effect.gen(function* () {
  const soda = yield* SodaClient;

  const query = SoQL.query()
    .select("title", "release_year", "locations")
    .where(SoQL.gte("release_year", 2020))
    .orderBy("release_year", "DESC")
    .limit(10);

  const rows = yield* soda.query("data.sfgov.org", "yitu-d5am", query);
  return rows;
});

// 3. Run
const rows = await Effect.runPromise(Effect.provide(program, layer));
```

## Service Methods

The `SodaClient` service exposes five methods:

### query

Returns a page of results as `ReadonlyArray<Record<string, unknown>>`.

```typescript
const rows = yield* soda.query("data.sfgov.org", "yitu-d5am", soqlBuilder);
```

### queryAll

Returns an Effect `Stream` that automatically paginates through all matching rows.

```typescript
import { Stream } from "effect";

const stream = yield* soda.queryAll("data.sfgov.org", "yitu-d5am", soqlBuilder);
yield* Stream.runForEach(stream, (row) =>
  Effect.log(`${row.title} (${row.release_year})`),
);
```

### metadata

Fetches dataset metadata, returned as a schema-validated `DatasetMetadata` object.

```typescript
const meta = yield* soda.metadata("data.sfgov.org", "yitu-d5am");
console.log(meta.name);       // "Film Locations in San Francisco"
console.log(meta.columns);    // Array of Column objects
console.log(meta.owner);      // { id, displayName }
```

### export\_

Streams a full dataset download as `Uint8Array` chunks in CSV, JSON, or TSV format.

```typescript
const stream = yield* soda.export_("data.sfgov.org", "yitu-d5am", "csv");
yield* Stream.runForEach(stream, (chunk) =>
  Effect.sync(() => process.stdout.write(chunk)),
);
```

### discover

Search the Socrata open data catalog across portals. Returns a schema-validated `CatalogResponse` containing matching datasets.

```typescript
import { CatalogResponse } from "@soda3js/client";

const catalog = yield* soda.discover({
  q: "film locations",
  domains: ["data.sfgov.org"],
  limit: 10,
});

for (const result of catalog.results) {
  console.log(result.resource.name, result.resource.id);
}
```

`DiscoveryParams` fields: `q`, `domains`, `categories`, `tags`, `only`, `limit`, `offset`, `order`.

## Typed Query Results

Pass an Effect `Schema` to `query` to validate and type each row at runtime.

```typescript
import { Schema } from "effect";

const Film = Schema.Struct({
  title: Schema.String,
  release_year: Schema.NumberFromString,
  locations: Schema.optional(Schema.String),
});

const films = yield* soda.query("data.sfgov.org", "yitu-d5am", query, {
  schema: Film,
});
// films: ReadonlyArray<{ title: string; release_year: number; locations?: string }>
```

Rows that fail validation produce a `SodaParseError` in the error channel.

## Response Hooks

Attach lifecycle hooks to observe responses from any endpoint. Useful for logging, metrics, and debugging.

```typescript
import { SodaClientConfig } from "@soda3js/client";
import type { ResponseHooks } from "@soda3js/client";
import { Effect } from "effect";

const hooks: ResponseHooks = {
  query: {
    onResponse: (result, ctx) =>
      Effect.log(`query ${ctx.domain}/${ctx.datasetId} took ${ctx.timing.requestMs}ms`),
  },
};

const config = SodaClientConfig.withHooks(
  new SodaClientConfig({ appToken: "..." }),
  hooks,
);
```

Hook endpoints: `query`, `metadata`, `export`, `discover`. Hooks that fail are silently caught so they never break the request pipeline.

## Typed Errors

All service methods return typed errors in the Effect error channel. Use `catchTag` for precise error handling.

```typescript
import { SodaNotFoundError, SodaQueryError, SodaRateLimitError } from "@soda3js/client";

const result = yield* soda.query("data.sfgov.org", "yitu-d5am", query).pipe(
  Effect.catchTag("SodaNotFoundError", (e) =>
    Effect.fail(`Dataset not found: ${e.message}`),
  ),
  Effect.catchTag("SodaQueryError", (e) =>
    Effect.fail(`Invalid SoQL: ${e.message}`),
  ),
  Effect.catchTag("SodaRateLimitError", () =>
    Effect.fail("Rate limited, try again later"),
  ),
);
```

Error types: `SodaAuthError`, `SodaNotFoundError`, `SodaQueryError`, `SodaRateLimitError`, `SodaServerError`, `SodaTimeoutError`.

## Caching

Attach a `CacheStore` to enable transparent response caching for `query` and `metadata` calls.

```typescript
import { MemoryCache } from "@soda3js/cache";

const cache = new MemoryCache({ maxEntries: 100 });
const config = SodaClientConfig.withCache(
  { appToken: process.env.SOCRATA_APP_TOKEN },
  cache,
  300, // TTL in seconds
);
```

Compatible cache backends: `MemoryCache` (`@soda3js/cache`), `FileSystemCache` (`@soda3js/cache-fs`), `SqliteCache` (`@soda3js/cache-sqlite`).

## Per-Domain Configuration

Configure different app tokens for different Socrata portals.

```typescript
const config = new SodaClientConfig({
  domains: {
    "data.sfgov.org": { appToken: "sf-token" },
    "data.cityofnewyork.us": { appToken: "nyc-token" },
  },
});
```

## API Mode

Control whether queries use SODA2 (GET with URL params) or SODA3 (POST with SQL body).

```typescript
const config = new SodaClientConfig({
  mode: "auto",  // default: uses SODA3 when appToken is set, SODA2 otherwise
});
```

Options: `"auto"`, `"soda2"`, `"soda3"`.

## License

[MIT](./LICENSE)
