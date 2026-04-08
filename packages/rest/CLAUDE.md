# @soda3js/rest

Batteries-included REST client for the Socrata SODA3 API. Bundles all
platform dependencies so consumers do not need Effect as a peer dep.

## Entry Points

No main export. Three subpath exports, one per platform:

- `@soda3js/rest/node` -- Node.js (`@effect/platform-node`)
- `@soda3js/rest/bun` -- Bun runtime
- `@soda3js/rest/browser` -- Browser (fetch-based)

Each entry point re-exports a pre-wired `Soda3Client` class.

## Architecture

- `soda3-client.ts` -- `Soda3ClientBase` class wrapping the Effect-based
  `SodaClient` service. Provides a class-based API that runs Effects
  internally, suitable for non-Effect codebases.
  - `query(datasetId, options?)` -- simple query with QueryOptions
  - `execute<T>(datasetId, builder)` -- advanced query with SoQLBuilder
  - `metadata(datasetId)` -- dataset metadata
  - `discover(params)` -- Discovery API (Socrata Catalog search)
  - `queryAll(datasetId, options?)` -- async iterable for paginated results
  - `export_(datasetId, format)` -- ReadableStream export (csv/json/tsv)
- `node.ts` / `bun.ts` / `browser.ts` -- Platform entry points that
  wire `Soda3ClientBase` with the correct `HttpClient` layer
- Re-exports `CatalogResponse` and `DatasetMetadata` types from client

## Dependencies

Fixed (not peer) deps: `@soda3js/client`, `@soda3js/soql`,
`@effect/platform`, `@effect/platform-node`, `effect`.

## Key Patterns

- **Class wrapper over Effect:** `Soda3Client` exposes Promise-based
  methods backed by the Effect runtime
- **Platform isolation:** All platform-specific code lives here,
  keeping `@soda3js/client` pure and platform-agnostic
- **Subpath-only exports:** Import from `@soda3js/rest/node` (etc.),
  never from `@soda3js/rest` directly
- **Optional caching:** `Soda3ClientConfig` accepts optional `cache`
  (`CacheStore`) and `cacheTtl` (number) fields; when provided,
  query and metadata calls use cache-aware endpoints from `@soda3js/client`
