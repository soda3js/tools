# @soda3js/client

Platform-agnostic Effect service library for the Socrata SODA3 API.
Single entry point (`./src/index.ts`). Peers: `effect`, `@effect/platform`.

## Architecture

Layered module structure:

- `services/SodaClient.ts` -- Effect service tag with 5 methods:
  `query`, `queryAll`, `metadata`, `export_`, `discover`
- `endpoints/` -- Effect implementations for each SodaClient method
  (query, queryAll, metadata, export, discovery, map-response-error)
- `schemas/` -- Effect Schema models (SodaClientConfig, DatasetMetadata,
  Column, Owner, SodaErrorResponse, CatalogResponse, DiscoveryResult,
  DiscoveryResource, DiscoveryClassification)
- `errors/` -- 7 typed Effect errors (SodaAuthError, SodaNotFoundError,
  SodaQueryError, SodaRateLimitError, SodaServerError, SodaTimeoutError,
  SodaParseError)
- `layers/SodaClientLive.ts` -- Live layer wiring endpoints to service tag
- `utils/` -- metrics (4 Effect Metric constants), redact (URL/header
  redaction), mode (query mode detection), pagination, cache (freshness
  tracking and cache-aware endpoint wrappers), hooks (response hooks)

Platform entry points (node.ts, bun.ts, browser.ts) and `Soda3Client`
class live in `@soda3js/rest`, not here.

**For detailed architecture and data flow:**
`@./.claude/design/client/architecture.md`

Load when modifying endpoints, schemas, error mapping, or layer wiring.

## Discovery API

- `endpoints/discovery.ts` -- queries the Socrata Catalog API
  (`api.us.socrata.com/api/catalog/v1`) for dataset search
- `DiscoveryParams` -- typed query interface: `q`, `domains`,
  `categories`, `tags`, `only`, `limit`, `offset`, `order`
- `CatalogResponse` + `DiscoveryResult` -- Effect Schema models
  for the catalog response
- Accessible via `SodaClient.discover(params)` on the service tag

## Typed Results and Parse Errors

- `query()` accepts optional `{ schema: Schema.Schema }` for
  row-level validation using Effect Schema
- `SodaParseError` -- returned when row validation fails; carries
  the underlying `ParseError` for diagnostics
- Exported `SodaError` union type includes all 7 error types

## Response Hooks

- `utils/hooks.ts` -- `ResponseHook`, `ResponseHooks`, `ResponseContext`
  types and `runHook` executor
- Enable callers to tap into response lifecycle for logging,
  telemetry, or transformation

## Cache Integration

- `SodaClientConfig.withCache(config, cache, ttl?)` -- static factory
  that attaches a `CacheStore` and optional TTL to the config
- When a `CacheStore` is present, `query` and `metadata` endpoints
  wrap responses with cache-aware logic (check/store/freshness)
- `utils/cache.ts` provides freshness tracking helpers used by
  the cache-aware endpoint wrappers
- `CacheStore` is an interface from `@soda3js/cache`; concrete
  implementations live in `cache-fs` and `cache-sqlite`

## Key Patterns

- **Static method service:** `SodaClient` uses `Context.Tag` with
  `makeSodaClient` factory -- call via `SodaClient.query(...)` directly
- **Schema-validated responses:** All API responses decoded through
  Effect Schema with structured parse errors
- **Typed error channel:** Every endpoint returns a union of typed
  Soda errors (`SodaError`) in the error channel
- **No platform coupling:** Requires `HttpClient` from the Effect
  environment; platform layers provided by `@soda3js/rest`

## Testing

Tests in `__test__/`. Run: `pnpm test` from repo root.

Coverage: strict level via root `vitest.config.ts`.
