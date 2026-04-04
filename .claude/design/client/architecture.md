---
status: current
module: client
category: architecture
created: 2026-04-04
updated: 2026-04-04
last-synced: 2026-04-04
completeness: 85
related:
  - ../architecture.md
  - ../soql/architecture.md
  - ../protocol/architecture.md
  - ../rest/architecture.md
dependencies: []
---

# @soda3js/client - Architecture

Effect-TS service library for the Socrata SODA3 API. Provides a platform-agnostic
`SodaClient` service tag, typed errors, Effect Schema-validated models, four
endpoint implementations, metrics, and log redaction.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)
7. [Observability](#observability)
8. [Testing Strategy](#testing-strategy)
9. [Future Work](#future-work)

---

## Overview

`@soda3js/client` is the Effect-TS service library for querying Socrata Open Data
portals. It sits between the pure SoQL query builder (`@soda3js/soql`) and the
consuming packages (`@soda3js/cli`, `@soda3js/rest`). The package has a single
`"."` export and:

- Defines the `SodaClient` Effect service tag with four methods: `query`, `queryAll`,
  `metadata`, and `export_`
- Implements dual-protocol support: SODA2 (GET with URL params) and SODA3 (POST with
  JSON body), with auto-selection based on whether an app token is present
- Validates configuration and response shapes with Effect Schema
- Maps all HTTP error status codes to a closed set of typed `SodaError` variants
- Provides four backend-agnostic Effect metrics and two redaction functions for
  observability without imposing any SDK on consumers

Platform entry points (`node.ts`, `bun.ts`, `browser.ts`) and the Promise-based
`Soda3Client` class live in `@soda3js/rest`, not here. This package requires
`HttpClient` from the Effect context; consumers (or `@soda3js/rest`) supply the
platform-specific layer.

The package is published with `"private": true` in source; `rslib-builder` rewrites
the `exports` map and strips dev metadata at build time. Effect and `@effect/platform`
are declared as peer dependencies.

---

## Current State

### What Is Implemented

All four service methods are fully implemented and tested:

| Method | SODA2 path | SODA3 path | Return type |
| --- | --- | --- | --- |
| `query` | `GET /resource/{id}.json?{params}` | `POST /api/v3/views/{id}/query.json` | `Effect<Row[], SodaError>` |
| `queryAll` | offset-based pagination via `paginateSoda2` | page-number pagination via `paginateSoda3` | `Effect<Stream<Row, SodaError>>` |
| `metadata` | `GET /api/views/{id}.json` | (same — no v3 variant) | `Effect<DatasetMetadata, SodaError>` |
| `export_` | `GET /api/views/{id}/rows.{fmt}?accessType=DOWNLOAD` | (same) | `Effect<Stream<Uint8Array, SodaError>, SodaError>` |

All six error types are implemented. All five schemas are implemented. Mode resolution,
pagination helpers, and the response-error mapper are implemented.

### Source Files

```text
packages/client/src/
  index.ts                      # public API re-exports (single "." entry point)
  services/
    SodaClient.ts               # Context.Tag + static methods
  layers/
    SodaClientLive.ts           # Layer<SodaClient, never, HttpClient>
  endpoints/
    query.ts                    # single-page query (SODA2 GET / SODA3 POST)
    query-all.ts                # paginated Stream via pagination utils
    metadata.ts                 # GET /api/views/{id}.json + Schema decode
    export.ts                   # GET /api/views/{id}/rows.{fmt} -> byte Stream
    map-response-error.ts       # HTTP status -> typed SodaError
  schemas/
    SodaClientConfig.ts         # Schema.Class — runtime-validated config
    DatasetMetadata.ts          # Schema.Class — dataset metadata shape
    Column.ts                   # Schema.Class — column descriptor
    Owner.ts                    # Schema.Class — dataset owner
    SodaErrorResponse.ts        # Schema.Class — SODA error envelope
  errors/
    SodaAuthError.ts            # Schema.TaggedError — 401/403
    SodaQueryError.ts           # Schema.TaggedError — 400
    SodaNotFoundError.ts        # Schema.TaggedError — 404
    SodaServerError.ts          # Schema.TaggedError — 5xx + internal
    SodaRateLimitError.ts       # Data.TaggedError — 429
    SodaTimeoutError.ts         # Data.TaggedError — client timeout
  utils/
    mode.ts                     # resolveMode() — pure function
    pagination.ts               # paginateSoda2(), paginateSoda3()
    metrics.ts                  # Effect Metric constants (4 metrics)
    redact.ts                   # redactUrl(), redactHeaders()
```

### Test Coverage

5 test files in `packages/client/__test__/`, plus a mock utility:

| File | Focus |
| --- | --- |
| `mode.test.ts` | `resolveMode()` — all auto/soda2/soda3 combinations |
| `pagination.test.ts` | `paginateSoda2`, `paginateSoda3` — empty, single, multi-page |
| `errors.test.ts` | `mapResponseError` — each HTTP status code, body parse fallback |
| `schemas.test.ts` | `Schema.decodeUnknown` round-trips for all five schema classes |
| `endpoints.test.ts` | `query`, `queryAll`, `metadata`, `export_` via mock HttpClient |
| `utils/mock-http-client.ts` | `makeMockHttpClient()` — captures requests, returns canned `[]` |

Coverage target: strict level (80/75/80/80).

---

## Rationale

### Decision 1: Effect Service Tag with Static Methods

`SodaClient` is defined as `Context.Tag` rather than a plain interface or class. Three
static methods live on the Tag class itself:

- `resolveToken(domain, config)` — pure, domain-specific token lookup with global fallback
- `buildClient(baseClient, domain, config)` — applies base URL and optional `x-app-token`
  header to a captured `HttpClient`
- `makeSodaClient(config)` — `Effect<SodaClient["Type"], never, HttpClient>` that captures
  the base client from context and wires all endpoints

This colocation keeps all construction logic in one file and avoids a separate builder
module. The Tag itself is also an importable value consumers can `yield*` inside
`Effect.gen`.

### Decision 2: Effect Schema.Class for Schemas and Most Errors

All five schemas use `Schema.Class`. Four of the six error types use `Schema.TaggedError`.
This provides:

- Runtime decode/encode symmetry — schemas validate incoming API JSON and outgoing
  config objects the same way
- `_tag` discriminant on error classes for `Effect.catchTag` exhaustive handling
- Structural compatibility with the planned `@soda3js/protocol` package (which will
  define matching plain-interface shapes that these classes decode from)

`SodaRateLimitError` and `SodaTimeoutError` use `Data.TaggedError` because they carry no
API-decoded fields — they are synthesized internally from HTTP status codes and config
values.

### Decision 3: No Barrel Re-exports in Subdirectories

No `index.ts` files exist inside `errors/`, `schemas/`, `endpoints/`, `services/`,
`layers/`, or `utils/`. All internal cross-imports use explicit file paths (e.g.,
`../errors/SodaAuthError.js`). Only `src/index.ts` aggregates the public API. This
prevents circular dependency risks and makes import origins unambiguous during refactoring.

### Decision 4: Auto Mode Resolution

`resolveMode()` in `utils/mode.ts` implements the rule: if `mode` is `"auto"` (the
default), presence of an app token selects `"soda3"` (POST), absence selects `"soda2"`
(GET). This is the correct production default because the SODA3 POST endpoint returns 403
without an app token. Consumers can override to `"soda2"` or `"soda3"` explicitly in
`SodaClientConfig`.

### Decision 5: Single Entry Point, No Platform Coupling

The client package has a single `"."` export (`src/index.ts`). Platform entry points
(`node.ts`, `bun.ts`, `browser.ts`) and the Promise-based `Soda3Client` class live
in `@soda3js/rest`. This keeps `client` platform-agnostic: it requires `HttpClient`
from the Effect context and never imports any platform-specific module. See
`rest/architecture.md` for the subpath export strategy.

### Design Patterns Used

- **Effect Service Tag pattern** (`Context.Tag`) — service interface is a value-level
  identifier consumers `yield*` to access the implementation
- **Layer composition** — `SodaClientLive` returns `Layer<SodaClient, never, HttpClient>`;
  platform entry points provide `HttpClient` from the right source
- **Effect Schema.Class** — schemas are classes with `Schema.Class` inheritance, giving
  both a constructor and a schema decoder on the same symbol
- **`Stream.paginateChunkEffect`** — drives paginated queries lazily; empty array signals
  last page per SODA API protocol

---

## System Architecture

### Layers

```text
                             consumers
                       (cli, rest, custom apps)
                                 |
                           SodaClient tag
                                 |
                        SodaClientLive(config)
                     Layer<SodaClient, never, HttpClient>
                                 |
                     HttpClient (from consumer context)
                                 |
              Provided by @soda3js/rest platform entries,
              @soda3js/cli, or any consumer-supplied layer
```

`SodaClientLive` depends on `HttpClient` from the Effect context. This
package does not provide any `HttpClient` implementation. Consumers supply
one via `@soda3js/rest` platform entries (which wire `NodeHttpClient`,
`FetchHttpClient`, etc.) or directly in their own Layer composition.

### Component Responsibilities

**`SodaClient` (services/SodaClient.ts)**

Defines the service interface (four methods), the Context.Tag identifier, and all
construction-time static methods. The service interface types reference `SoQLBuilder`
from `@soda3js/soql` for query arguments and `DatasetMetadata` from the schemas layer
for the metadata return type.

**`SodaClientLive` (layers/SodaClientLive.ts)**

A Layer factory: `(config?: SodaClientConfig) => Layer<SodaClient, never, HttpClient>`.
Calls `SodaClient.makeSodaClient(config)` and wraps it in `Layer.effect`. Defaults
to `new SodaClientConfig({})` when no config is passed.

#### Endpoint functions (endpoints/)

Pure functions taking a pre-configured `HttpClient` instance (already has base URL and
auth headers applied via `buildClient`), plus domain, datasetId, soql/format, and mode.
Return `Effect` or `Effect<Stream>`. Each endpoint catches `ResponseError` and
`RequestError` and maps them to typed `SodaError` variants via `mapResponseError` or
inline `SodaServerError` construction.

`map-response-error.ts` decodes the response body as `SodaErrorResponse`, extracts
`code` and `message`, then dispatches on HTTP status: 400 → `SodaQueryError`, 401/403 →
`SodaAuthError`, 404 → `SodaNotFoundError`, 429 → `SodaRateLimitError`, else
`SodaServerError`. Fallback to generic fields when body parse fails.

#### Schemas (schemas/)

Each schema is a standalone `Schema.Class`. `DatasetMetadata` composes `Column` and
`Owner`. `SodaClientConfig` is the only schema used as both a config object and a
decoder target. `SodaErrorResponse` is used only inside `mapResponseError` and is not
exposed as a primary API surface.

#### Errors (errors/)

Six error types form the closed `SodaError` union exported from `index.ts`. Four are
`Schema.TaggedError` (carry API-decoded fields); two are `Data.TaggedError` (synthesized
internally). All carry `_tag` discriminants matching their class name.

#### Utils (utils/)

`mode.ts`: Single pure function `resolveMode()`. Exported type `ApiMode = "soda2" | "soda3"`;
exported config type `ApiModeConfig = "auto" | "soda2" | "soda3"`. No side effects.

`pagination.ts`: `paginateSoda2` uses `Stream.paginateChunkEffect` with `offset`-based
state (0, 1000, 2000, ...). `paginateSoda3` uses page-number state (1, 2, 3, ...).
Both terminate when the fetched page is empty.

---

## Data Flow

### Request Lifecycle

```text
Consumer calls soda.query(domain, datasetId, soql)
    |
    v
resolveModeForDomain(domain)
    -- resolveToken() checks domains[domain].appToken, falls back to config.appToken
    -- resolveMode({ mode, appToken }) -> "soda2" | "soda3"
    |
    v
SodaClient.buildClient(baseClient, domain, config)
    -- HttpClient.mapRequest: prependUrl "https://{domain}"
    -- HttpClient.mapRequest: setHeader "x-app-token" (if token present)
    |
    v
queryEndpoint(client, domain, datasetId, soql, mode)
    |
    +-- mode === "soda2":
    |       client.get("/resource/{id}.json?{soql.toParams()}")
    |       -> HttpClientResponse.filterStatusOk
    |       -> response.json
    |       -> cast to ReadonlyArray<Record<string, unknown>>
    |
    +-- mode === "soda3":
            HttpClientRequest.post("/api/v3/views/{id}/query.json")
            + HttpClientRequest.bodyJson({ query: soql.toBody() })
            -> client.execute(request)
            -> HttpClientResponse.filterStatusOk
            -> response.json
            -> cast to ReadonlyArray<Record<string, unknown>>
    |
    v
Error mapping (Effect.catchTag)
    -- "ResponseError"  -> mapResponseError(error, { domain, datasetId, soql })
    -- "RequestError"   -> SodaServerError({ code: "request_error", ... })
    -- "HttpBodyError"  -> SodaServerError({ code: "body_error", ... }) [soda3 only]
```

### Paginated Query Flow (queryAll)

```text
queryAllEndpoint returns Effect.succeed(stream) immediately.
Stream is lazy — pages fetched on demand.

paginateSoda2:
    state = 0 (offset)
    fetchPage(1000, 0)  -> rows -> emit chunk, next state = 1000
    fetchPage(1000, 1000) -> rows -> emit chunk, next state = 2000
    ...
    fetchPage(1000, N)  -> [] -> terminate (Option.none)

paginateSoda3:
    state = 1 (pageNumber)
    fetchPage(1, 1000)  -> rows -> emit chunk, next state = 2
    ...
    fetchPage(N, 1000)  -> [] -> terminate
```

### Metadata Flow

```text
metadataEndpoint(client, domain, datasetId)
    -> client.get("/api/views/{datasetId}.json")
    -> HttpClientResponse.filterStatusOk
    -> response.json
    -> Schema.decodeUnknown(DatasetMetadata)(json)
       -- validates timestamps as numbers, columns as Column[], owner as Owner
       -- "ParseError" caught -> SodaServerError({ code: "parse_error" })
    -> DatasetMetadata instance
```

---

## Integration Points

### Upstream: `@soda3js/soql`

`SodaClient.ts` imports `SoQLBuilder` as a type (no runtime import). Endpoints call
`soql.toParams()` for SODA2 and `soql.toBody()` for SODA3. The paginated endpoint
calls `soql.limit(n).offset(k)` to construct page-specific sub-queries. All of
`@soda3js/soql` is re-exported from `src/index.ts` as a convenience so consumers
need only import from `@soda3js/client`.

### Downstream: `@soda3js/cli` (current)

CLI imports `SodaClient`, `SodaClientLive`, `SodaClientConfig`, `SoQL`, and error
types from `@soda3js/client`. CLI provides its own platform layer (likely
`NodeSodaClientLive`) and manages the Effect runtime.

### Downstream: `@soda3js/rest` (implemented)

`@soda3js/rest` is a batteries-included wrapper with no main export — only
`@soda3js/rest/node`, `/bun`, and `/browser` subpath exports. Each entry wires
`SodaClientLive` with the correct platform `HttpClient` layer and re-exports the
`Soda3Client` class for Promise-based consumers. All platform dependencies are
fixed (not peer), so `npm install @soda3js/rest` resolves everything.

### Downstream: `@soda3js/api` (pending)

API server will import error types and potentially `SodaClientConfig` schemas.

### Peer: `@soda3js/protocol` (implemented)

`@soda3js/protocol` defines plain TypeScript interfaces for SODA wire formats:
`DatasetMetadataShape`, `ColumnShape`, `OwnerShape`, and `SodaErrorResponseShape`.
The `Schema.Class` types in `schemas/` decode from these canonical interface shapes.
`protocol` has zero dependencies and no Effect or runtime coupling.

---

## Observability

### Metrics

Four backend-agnostic Effect `Metric` constants are defined in `utils/metrics.ts`:

| Constant | Type | Description |
| --- | --- | --- |
| `requestsTotal` | `Metric.counter` | Total SODA API requests made |
| `requestDuration` | `Metric.histogram` | Request duration in ms (boundaries: 10-10000) |
| `errorsTotal` | `Metric.counter` | Total SODA API errors |
| `retriesTotal` | `Metric.counter` | Total request retries |

Consumers wire their own exporter (OTLP, Prometheus, CloudWatch) via `NodeSdk.layer`
or equivalent. No observability SDK dependency appears in this package.

### Log Redaction

Two functions in `utils/redact.ts` strip sensitive values at the emission point:

- `redactUrl(url)` — replaces `$$app_token` query parameter values with `[REDACTED]`
- `redactHeaders(headers)` — replaces `x-app-token` and `authorization` header values
  with `[REDACTED]`; returns a new object without mutating the input

These are called inside endpoint functions before any value reaches a log line, error
message, or span attribute.

---

## Testing Strategy

### Mock HttpClient

`__test__/utils/mock-http-client.ts` provides `makeMockHttpClient()`, which returns a
`Layer<HttpClient>` and a mutable `requests` array. The mock captures every outgoing
request (URL, method, headers) and returns a canned `200 OK` with `[]` as the body.
Helper functions `runWithLayer`, `runAuthTest`, and `captureAuthRequest` compose the
mock with auth middleware layers for assertion.

Tests run the full Effect stack (`Effect.runPromise`) with the mock layer provided via
`Effect.provide`. No network calls are made.

### What Is Tested

- `mode.test.ts`: All combinations of `mode` config and `appToken` presence, verifying
  that `resolveMode` returns the correct `ApiMode`
- `pagination.test.ts`: Empty first page terminates stream; single and multi-page
  sequences emit correct chunks and advance state correctly for both SODA2 and SODA3
- `errors.test.ts`: `mapResponseError` dispatches to the correct typed error for each
  HTTP status (400, 401, 403, 404, 429, 500); body parse failure falls back gracefully
- `schemas.test.ts`: `Schema.decodeUnknown` round-trips for all five `Schema.Class`
  types with valid inputs; invalid inputs produce `ParseError`
- `endpoints.test.ts`: Each endpoint function sends the correct URL, method, and headers
  for both SODA2 and SODA3 modes; auth header present only when token configured

### Coverage Target

Strict level: 80% statements / 75% branches / 80% functions / 80% lines.

---

## Future Work

### Retry Logic

`SodaRateLimitError` carries a `retryAfter` field (currently hardcoded to 1000ms
because no `Retry-After` header exists on SODA 429 responses). A retry policy using
Effect's `Schedule` module with synthetic exponential backoff should be added as an
optional layer or middleware.

### Timeout Enforcement

`SodaClientConfig` has a `timeout` field defined in the schema but it is not yet
consumed anywhere. `SodaTimeoutError` is defined but never raised. Timeout enforcement
using `Effect.timeoutFail` around endpoint execution needs to be wired in.

---

**Document Status:** Current — all Phase 2 client functionality implemented on
`feat/client` branch, including metrics, redaction, and protocol integration.

**Next Update:** When retry logic or timeout enforcement is added.
