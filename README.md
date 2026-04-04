# soda3js

A modern TypeScript toolkit for the [Socrata SODA3 Open Data API](https://dev.socrata.com/).

> **Status:** Pre-release (v0.0.x). APIs will change before v0.1.0.

## What is this?

soda3js lets you query, export, and serve open data from any Socrata-powered
portal (NYC Open Data, Chicago Data Portal, SF OpenData, and hundreds more).
It works without authentication for basic queries and upgrades automatically
when you provide an app token.

## Packages

This monorepo contains five packages:

| Package | Description | Install |
| --- | --- | --- |
| `@soda3js/soql` | Type-safe SoQL query builder (pure TS, zero deps) | `npm i @soda3js/soql` |
| `@soda3js/client` | Effect-TS HTTP client with Node/Bun/Browser support | `npm i @soda3js/client` |
| `@soda3js/cli` | Terminal client for querying datasets (`soda3` binary) | `npm i -g @soda3js/cli` |
| `@soda3js/api` | SODA3-compatible server framework | Coming soon |
| `@soda3js/server` | Internal integration test harness | Private |

## Quick Start

### Query builder only (zero dependencies)

```typescript
import { SoQL } from "@soda3js/soql";

const q = SoQL.query()
  .select("complaint_type", "borough")
  .where(SoQL.eq("borough", "BROOKLYN"))
  .limit(10);

const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?${q.toParams()}`;
const rows = await fetch(url).then((r) => r.json());
```

### Effect-TS client

```typescript
import { SodaClient } from "@soda3js/client";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const soda = yield* SodaClient;

  const rows = yield* soda.query(
    "data.cityofnewyork.us",
    "ydr8-5enu",
    SoQL.query().select("*").where(SoQL.eq("borough", "BROOKLYN")).limit(10),
  );
});
```

### CLI

```bash
soda3 query ydr8-5enu \
  --domain data.cityofnewyork.us \
  --select "complaint_type,borough" \
  --where "borough='BROOKLYN'" \
  --limit 10
```

## Monorepo Structure

```text
soda3js/tools/
  packages/
    soql/          # SoQL query builder
    client/        # Effect-TS HTTP client
    cli/           # Terminal client (soda3 binary)
    api/           # SODA3 server framework
    server/        # Internal test harness (private)
  website/         # RSPress documentation site
  __fixtures__/    # Shared test fixture data
  lib/configs/     # Shared lint-staged, commitlint configs
```

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
