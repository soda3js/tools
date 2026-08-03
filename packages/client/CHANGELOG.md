# @soda3js/client

## 0.1.0

### Features

* ### Adds @soda3js/client Package

  * Add Effect service library for querying Socrata open data portals.
  * SodaClient Context.Tag with four endpoints: query (single-page), queryAll (Stream-based pagination), metadata, and export. Dual-mode SODA2 GET and SODA3 POST dispatch with per-domain token resolution.
  * Six typed errors (SodaAuthError, SodaQueryError, SodaNotFoundError, SodaServerError, SodaRateLimitError, SodaTimeoutError). Five Schema.Class types for config and response validation. Effect Metric constants for observability and URL/header redaction utilities. Platform-agnostic with a single export entry point.

- ### Cache-aware endpoints

  * `SodaClientConfig.withCache(config, cache, ttl?)` -- static factory that attaches a CacheStore instance and optional TTL to the client config
  * When a CacheStore is provided, query and metadata endpoints check the cache before making HTTP requests
  * TTL-gated metadata preflight: within TTL trusts cached rowsUpdatedAt, after TTL re-checks the metadata endpoint
  * New `cachedQuery()`, `cachedMetadata()`, `getFreshness()`, `setFreshness()` utilities exported from the public API [#55][#55]

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

### Tests

* Fixture population script using TestServer record mode against live Socrata portals
* Client integration tests (round-trip, error handling, export) against TestServer replay
* REST integration tests for Soda3Client against TestServer
* CLI integration tests spawning binary against TestServer
* E2E tests against live SF Films, NYC 311, and Chicago Crimes portals
* Weekly E2E CI workflow with manual dispatch and PR label triggers [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/cache    | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/protocol | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/soql     | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55

[#56]: https://github.com/soda3js/tools/pull/56
