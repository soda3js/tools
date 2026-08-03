# @soda3js/protocol

## 0.1.0

### Features

* ### Adds @soda3js/protocol Package

  Add wire-format TypeScript interfaces and runtime type guards for the Socrata SODA3 API. Zero-dependency leaf package providing DatasetMetadataShape, ColumnShape, OwnerShape, and SodaErrorResponseShape interfaces with corresponding isDatasetMetadataShape, isColumnShape, isOwnerShape, and isSodaErrorResponseShape type guards for structural validation. Shared contract between client (decoder) and api (producer).

- ### Cache store interface and types

  * `CacheStore` -- async key-value interface (`get`, `set`, `has`, `invalidate`, `prune`) for pluggable cache backends
  * `CacheEntry` -- stored response shape with body, content type, headers, freshness metadata, and optional query string
  * `CacheKeyInput`, `PruneOptions`, `PruneResult`, `DatasetFreshness` -- supporting types for key construction, pruning, and freshness tracking [#55][#55]

* ### Discovery API

  Full-stack implementation of the Socrata Discovery API for dataset search across all portals via api.us.socrata.com.

  * Protocol: `DiscoveryResultShape`, `CatalogResponseShape` interfaces and `isDiscoveryResultShape`, `isCatalogResponseShape` type guards
  * Client: `SodaClient.discover()` with keyword search, domain/category/tag filtering, and pagination
  * REST: `Soda3Client.discover()` Promise-based wrapper
  * CLI: `soda3 search` command with table/json/ndjson output

  ### Response Hooks

  Optional callback system for tapping into the response pipeline per endpoint. Hooks run after decode, before return, with errors silently caught. Registered via `SodaClientConfig.withHooks()`. [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55

[#56]: https://github.com/soda3js/tools/pull/56
