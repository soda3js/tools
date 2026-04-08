# @soda3js/rest

Batteries-included REST client for the [Socrata SODA3 API](https://dev.socrata.com/). Promise-based `Soda3Client` class that works without any Effect knowledge. Bundles all platform dependencies internally.

## Install

```bash
npm install @soda3js/rest
```

Import from one of three platform-specific entry points (there is no main export):

| Entry Point | Runtime | HTTP Backend |
| --- | --- | --- |
| `@soda3js/rest/node` | Node.js | `undici` |
| `@soda3js/rest/bun` | Bun | `fetch` |
| `@soda3js/rest/browser` | Browser | `fetch` |

## Quick Start

```typescript
import { Soda3Client } from "@soda3js/rest/node";

const client = new Soda3Client({
  domain: "data.sfgov.org",
  appToken: process.env.SOCRATA_APP_TOKEN,
});

const films = await client.query("yitu-d5am", {
  select: ["title", "release_year", "locations"],
  where: "release_year >= 2020",
  orderBy: "release_year:DESC",
  limit: 10,
});

console.log(films);
```

## API

### query

Fetch a page of rows with optional filtering, sorting, and pagination.

```typescript
const rows = await client.query("yitu-d5am", {
  select: ["title", "release_year"],
  where: "release_year > 2015",
  orderBy: "release_year:DESC",
  limit: 25,
  offset: 0,
});
```

`QueryOptions` fields:

- `select` -- array of column names
- `where` -- SoQL WHERE expression string
- `orderBy` -- column and direction separated by colon (e.g. `"release_year:DESC"`)
- `limit` -- maximum rows to return
- `offset` -- rows to skip

### queryAll

Stream through all matching rows with automatic pagination. Returns an `AsyncIterableIterator`.

```typescript
for await (const row of client.queryAll("yitu-d5am", {
  select: ["title", "locations"],
  where: "locations IS NOT NULL",
})) {
  console.log(row.title, row.locations);
}
```

### metadata

Fetch dataset metadata (name, columns, owner, last updated).

```typescript
const meta = await client.metadata("yitu-d5am");

console.log(meta.name);          // "Film Locations in San Francisco"
console.log(meta.columns.length); // number of columns
console.log(meta.rowsUpdatedAt);  // epoch timestamp
```

### execute

Run a `SoQLBuilder` query with a generic type parameter for typed results. Useful when you build queries with `@soda3js/soql` directly.

```typescript
import { SoQL } from "@soda3js/soql";

interface Film {
  title: string;
  release_year: string;
  locations: string;
}

const query = SoQL.query()
  .select("title", "release_year", "locations")
  .where(SoQL.gte("release_year", 2020))
  .limit(10);

const films = await client.execute<Film>("yitu-d5am", query);
// films: ReadonlyArray<Film>
```

### discover

Search the Socrata open data catalog across portals.

```typescript
const catalog = await client.discover({
  q: "film locations",
  domains: ["data.sfgov.org"],
  limit: 10,
});

for (const result of catalog.results) {
  console.log(result.resource.name, result.resource.id);
}
```

`discover` parameters: `q`, `domains`, `categories`, `tags`, `only`, `limit`, `offset`.

### export\_

Stream a full dataset download as a `ReadableStream<Uint8Array>`. Supported formats: `"csv"`, `"json"`, `"tsv"`.

```typescript
import { createWriteStream } from "node:fs";
import { Writable } from "node:stream";

const stream = client.export_("yitu-d5am", "csv");
const fileStream = Writable.toWeb(createWriteStream("films.csv"));
await stream.pipeTo(fileStream);
```

## Caching

Pass a `CacheStore` implementation to enable transparent response caching.

```typescript
import { Soda3Client } from "@soda3js/rest/node";
import { MemoryCache } from "@soda3js/cache";

const client = new Soda3Client({
  domain: "data.sfgov.org",
  appToken: process.env.SOCRATA_APP_TOKEN,
  cache: new MemoryCache({ maxEntries: 100 }),
  cacheTtl: 300, // seconds
});
```

## Effect Layer Access

Each entry point also re-exports the full `@soda3js/client` API and a pre-wired Effect layer for advanced usage.

```typescript
import { NodeSodaClientLive, SodaClient, SodaClientConfig } from "@soda3js/rest/node";
import { Effect } from "effect";

const layer = NodeSodaClientLive(new SodaClientConfig({
  appToken: process.env.SOCRATA_APP_TOKEN,
}));

const program = Effect.gen(function* () {
  const soda = yield* SodaClient;
  // ... use the Effect-based API
});

await Effect.runPromise(Effect.provide(program, layer));
```

## License

[MIT](./LICENSE)
