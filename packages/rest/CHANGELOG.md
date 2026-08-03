# @soda3js/rest

## 0.1.0

### Features

* ### Adds @soda3js/rest Package

  Add batteries-included REST client for the Socrata SODA3 API. Soda3Client class with Promise-based query, metadata, queryAll, and export\_ methods. Three subpath exports: @soda3js/rest/node (undici), @soda3js/rest/bun (fetch), @soda3js/rest/browser (fetch). All Effect dependencies bundled as fixed deps so npm install just works. queryAll streams lazily via Stream.toAsyncIterable; export\_ streams bytes via ReadableStream without buffering.

- ### Optional caching support

  * `Soda3ClientConfig` accepts optional `cache` (CacheStore) and `cacheTtl` (number) fields
  * When provided, query and metadata calls use cache-aware endpoints from the client layer
  * No default cache -- consumers opt in by passing a MemoryCache, BrowserCache, FileSystemCache, or any custom CacheStore implementation [#55][#55]

* ### Discovery API

  Full-stack implementation of the Socrata Discovery API for dataset search across all portals via api.us.socrata.com.

  * Protocol: `DiscoveryResultShape`, `CatalogResponseShape` interfaces and `isDiscoveryResultShape`, `isCatalogResponseShape` type guards
  * Client: `SodaClient.discover()` with keyword search, domain/category/tag filtering, and pagination
  * REST: `Soda3Client.discover()` Promise-based wrapper
  * CLI: `soda3 search` command with table/json/ndjson output

  ### Response Hooks

  Optional callback system for tapping into the response pipeline per endpoint. Hooks run after decode, before return, with errors silently caught. Registered via `SodaClientConfig.withHooks()`. [#56][#56]

- ### Typed Query Results

  * `SodaClient.query()` accepts optional `{ schema }` parameter for Effect Schema validation of result rows
  * `SodaParseError` typed error surfaced when schema validation fails
  * `Soda3Client.execute()` accepts a SoQLBuilder directly for fluent query-to-execution workflows [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/client   | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/protocol | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/soql     | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55

[#56]: https://github.com/soda3js/tools/pull/56
