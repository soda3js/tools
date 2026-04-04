---
status: current
category: architecture
created: 2026-04-04
updated: 2026-04-04
last-synced: 2026-04-04
completeness: 90
related:
  - soql/architecture.md
  - client/architecture.md
  - protocol/architecture.md
  - rest/architecture.md
dependencies: []
---

# soda3js Monorepo — Architecture

A seven-package TypeScript monorepo providing a full toolkit for the Socrata
SODA3 Open Data API, from a zero-dependency query builder through an
Effect-TS service library to a batteries-included REST client and CLI.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [Package Dependency Graph](#package-dependency-graph)
5. [Observability Strategy](#observability-strategy)
6. [Platform Strategy](#platform-strategy)
7. [Auth Strategy](#auth-strategy)
8. [Wire-Format Contract](#wire-format-contract)
9. [Development Phases](#development-phases)

---

## Overview

The soda3js toolkit is organized around a clear separation of concerns across
seven packages under `packages/`. Two packages are pure-TypeScript leaves with
zero runtime dependencies. The rest layer upward, each adding one concern:
Effect service semantics, platform I/O adapters, a CLI runtime, or a
server-side framework.

**Packages:**

| Package | Purpose | Published |
| --- | --- | --- |
| `@soda3js/soql` | SoQL query builder (pure TS, zero deps) | Yes |
| `@soda3js/protocol` | Wire-format type contracts (plain TS interfaces, zero deps) | Yes |
| `@soda3js/client` | Effect service library (peer deps: effect, @effect/platform) | Yes |
| `@soda3js/rest` | Batteries-included REST client (fixed platform deps) | Yes |
| `@soda3js/cli` | Terminal client (`@effect/cli`, bin: `soda3`) | Yes |
| `@soda3js/api` | SODA3 server framework (Bun-native) | Eventually |
| `@soda3js/server` | Internal integration test harness (private) | No |

**SODA API dual-mode operation:**

The Socrata API has two relevant versions. SODA2 (`GET /resource/{id}.json`)
works without authentication. SODA3 (`POST /api/v3/views/{id}/query.json`)
requires an app token and returns 403 without one. The client auto-selects the
mode per domain: SODA2 when no token is configured, SODA3 when a token is
present. `soql.toParams()` is the primary compilation target (SODA2 GET);
`soql.toBody()` is the secondary target (SODA3 POST).

---

## Current State

### Phase 1 Complete — `@soda3js/soql`

The `soql` package is fully implemented and published at `v0.0.1`. It provides
a type-safe, zero-dependency SoQL query builder with 138 tests at strict
coverage (80/75/80/80). See
`@./.claude/design/soql/architecture.md` for detailed architecture.

### Phase 2 Complete — `@soda3js/protocol`, `@soda3js/client`, `@soda3js/rest`

All three Phase 2 packages are implemented on the `feat/client` branch:

- `@soda3js/protocol` — plain TypeScript interfaces for SODA wire formats
  (`DatasetMetadataShape`, `ColumnShape`, `OwnerShape`, `SodaErrorResponseShape`).
  Zero dependencies.
- `@soda3js/client` — Effect service library with `SodaClient` service tag,
  four endpoints (`query`, `queryAll`, `metadata`, `export_`), typed errors,
  Schema-validated models, metrics, and log redaction. Single `"."` export;
  platform-agnostic (requires `HttpClient` from consumer).
- `@soda3js/rest` — batteries-included wrapper with `Soda3Client` class. No
  main export; three subpath exports (`./node`, `./bun`, `./browser`). Fixed
  dependencies bundle all platform adapters.

Target milestone: publish `v0.0.2` with all three packages.

### Phases 3–5 Pending

- Phase 3: `@soda3js/server` (replay harness) + `@soda3js/api` (route handlers
  - in-memory engine)
- Phase 4: `@soda3js/cli` terminal client
- Phase 5: full v0.1.0 release with docs, geospatial functions (Tier 3),
  SQLite and Postgres backends for `api`

---

## Rationale

### Why separate `protocol`, `client`, and `rest`?

These three packages encode three distinct consumer needs:

- **`protocol`** — any package that needs to agree on what the SODA wire
  format looks like (both `client` decoding responses and `api` producing
  them) without importing anything else. Zero dependencies enforces this.

- **`client`** — advanced consumers (the CLI, custom integrations, Enterprise
  applications) want Effect-native composition with full control over HttpClient
  layers, auth strategies, logger backends, and span exporters. Declaring
  `effect` and `@effect/platform` as peer dependencies means consumers control
  the version and no duplicate Effect instances appear in the dependency tree.

- **`rest`** — casual consumers want `npm install @soda3js/rest` and a Promise
  API with no Effect knowledge required. Bundling all platform dependencies as
  fixed deps eliminates the "what do I also need to install?" question.

Separating `rest` from `client` is what allows `client` to remain
platform-agnostic. If platform adapters lived in `client`, every consumer would
pull in Node and Bun platform packages even if they only target the browser.

### Why Effect for `client`?

Effect provides structured concurrency, typed error channels, dependency
injection via layers, and built-in observability primitives — all needed by
a production HTTP client. The alternative (Promise chains with manual error
handling, ad hoc DI, separate observability wiring) would replicate a
significant fraction of what Effect provides, at lower quality.

Effect v3 is stable and actively maintained. There is a clear v4 migration
path. The peer-dependency model means consumers pin their own Effect version.

### Observability strategy rationale

Libraries must not impose an observability backend on their consumers. A library
that imports `NodeSdk.layer` forces Node.js on browser consumers. A library
that imports Prometheus bindings forces that exporter on every consumer
regardless of their infrastructure. By emitting signals through Effect's
built-in primitives (`Effect.log*`, `Metric.*`, `Effect.withSpan`) and leaving
backend wiring to consumers at Layer composition time, libraries remain
universally composable.

---

## Package Dependency Graph

Leaves are at the top. Arrows point from consumer to dependency.

```text
@soda3js/soql       @soda3js/protocol        (leaves, pure TS, zero deps)
    ^    ^                ^    ^    ^
    |    |                |    |    |
    |    +----------+     |    |    |
    |               |     |    |    |
@soda3js/client ----+-----+    |    |  (Effect service lib, peer deps)
    ^    ^                     |    |
    |    |                     |    |
    |  @soda3js/rest           |    |  (batteries-included, fixed deps)
    |                          |    |
@soda3js/cli         @soda3js/api           (applications/frameworks)
                           ^
                           |
                     @soda3js/server        (private test harness)
```

**Key relationships:**

- `soql` and `protocol` are leaves. They have no runtime dependencies on each
  other or on anything else.
- `client` depends on `soql` (to accept `SoQLBuilder` queries) and on
  `protocol` (to decode SODA wire-format responses). Its Effect stack is
  declared as peer dependencies.
- `rest` depends on `client` and re-exports `SoQL`. It bundles all platform
  adapters as fixed dependencies and provides conditional exports for Node, Bun,
  and browser.
- `cli` depends on `client` and `soql` directly, wires its own HttpClient layer
  (Node undici), and reads auth from TOML profiles.
- `api` depends on `soql` (to consume AST types for the SoQL-to-SQL transpiler)
  and on `protocol` (to produce responses the `client` can decode).
- `server` depends on `api` and `client`, used only for integration testing.

---

## Observability Strategy

All Effect packages (`client`, `rest`, `cli`) emit observability signals using
Effect's built-in primitives. No observability SDK dependency appears in any
library package.

**Logging:** `Effect.log*` with `Effect.annotateLogs` for structured fields.
Log level and format controlled by the consumer's Logger layer.

**Metrics:** Four `Metric` module-level constants defined in
`client/src/utils/metrics.ts`: `requestsTotal` (counter),
`requestDuration` (histogram with ms boundaries), `errorsTotal` (counter),
and `retriesTotal` (counter). Consumers wire their own exporter (OTLP,
Prometheus, CloudWatch) via `NodeSdk.layer` or equivalent.

**Tracing:** `Effect.withSpan` and `Effect.annotateCurrentSpan` following
OpenTelemetry semantic conventions. No tracer SDK imported in library code.

**Redaction:** `redactUrl()` and `redactHeaders()` in `client/src/utils/redact.ts`
are called at the emission point — inside `client`. `redactUrl` strips
`$$app_token` query parameters; `redactHeaders` replaces `x-app-token` and
`authorization` header values with `[REDACTED]`. Consumers never need to add
redaction middleware.

**Consumer wiring:** Consumers provide their observability backend at Layer
composition time via `Logger.replace`, `NodeSdk.layer`,
`Effect.withTracerScoped`, etc. A consumer that does not provide a backend gets
the Effect default (stderr logging, no metrics export, no tracing).

---

## Platform Strategy

Platform adaptation lives exclusively in `@soda3js/rest`, not in `client`.

**`@soda3js/client`** requires `HttpClient` in the Effect context. It does not
import any platform package. This makes it universal: usable in Node, Bun, and
the browser with whichever HttpClient layer the consumer provides.

**`@soda3js/rest`** uses subpath exports to serve three platforms from a
single package install. There is no main `"."` export — consumers must import
a specific platform entry:

```json
{
  "exports": {
    "./node": "./src/node.ts",
    "./bun": "./src/bun.ts",
    "./browser": "./src/browser.ts"
  }
}
```

- `./node` entry bundles `NodeHttpClient.layerUndici` from `@effect/platform-node`
- `./bun` and `./browser` entries bundle `FetchHttpClient.layer` from
  `@effect/platform`
- All platform packages are fixed dependencies — `npm install @soda3js/rest`
  resolves everything without additional peer installs

**`@soda3js/cli`** does not use `rest`. It imports `client` directly, provides
its own `NodeHttpClient.layerUndici` layer, and controls the entire Effect
runtime.

**`@soda3js/api`** and **`@soda3js/server`** are Bun-native (use `Bun.serve()`,
`bun:sqlite`). They use `@savvy-web/rslib-builder` in early phases and will
migrate to a Bun-specific builder when Bun APIs are actively imported.

### Workspace Root Development Setup

The root `package.json` includes `@soda3js/rest`, `@soda3js/cli`, and `tsx` as
devDependencies. All packages have `prepare` scripts that build `dist/dev/`
during `pnpm install`, so workspace symlinks resolve correctly at the root
level. This enables workspace-level scripts to import from `@soda3js/rest/node`
and run against live portals, and will allow root-level integration tests
(Phase 3+) and CLI development (Phase 4) without manual build steps.

---

## Auth Strategy

Token sourcing is entirely a consumer concern. The `client` package provides
the mechanism (per-domain token lookup); consumers decide how tokens are
obtained.

**Per-domain token lookup in `client`:** `SodaClientConfig` holds a
`tokens: Record<string, string>` map. `SodaClient.resolveToken(domain, config)`
looks up the token for the specific domain being queried. This design supports
multi-portal usage in a single process — different domains can have different
tokens.

**Mode selection per domain:** If `resolveToken` returns a token for the
queried domain, the client uses SODA3 mode (`POST /api/v3/views/{id}/query.json`
with `X-App-Token` header). If no token is found, it falls back to SODA2 mode
(`GET /resource/{id}.json`). A consumer can force a specific mode via
`config.mode: "soda2" | "soda3" | "auto"`.

**CLI reads TOML profiles:** The CLI reads `~/.config/soda3js/config.toml`
(XDG-compliant). Each profile holds `domain` and `token`. The CLI maps the
`token` key to `appToken` when constructing `SodaClientConfig`.

**`@soda3js/rest` constructor arg:** The `Soda3Client` class accepts
`{ domain, appToken?, mode? }` in its constructor. The domain is captured
at construction time (unlike the Effect API where domain is per-call).

**`@soda3js/api` validates inbound tokens:** The server framework validates
`X-App-Token` on SODA3 endpoints, mirroring how the real Socrata API behaves.
Token validation is done in `middleware/auth.ts`.

---

## Wire-Format Contract

**Problem:** `@soda3js/client` decodes API responses. `@soda3js/api` produces
API responses. They must agree on shape, or schema drift causes silent data
loss.

**Solution:** The `@soda3js/protocol` package defines plain TypeScript
interfaces for all SODA wire formats:

- `DatasetMetadataShape` — shape of `GET /api/views/{id}.json` responses
- `ColumnShape`, `OwnerShape` — nested shapes within metadata
- `SodaErrorResponseShape` — shape of all SODA error responses
  (`{ code, error: true, message, data? }`)

Both `client` (decoding) and `api` (producing) import from `protocol`. Because
`protocol` has zero dependencies and no Effect or runtime coupling, it can be
safely imported by both packages regardless of their runtime environments.

**AST types as a secondary contract:** The `soql` package exports its AST node
types publicly. The `api` package consumes these types for its SoQL-to-SQL
transpiler (Phase 2). The `ast-contract.test.ts` test suite in the `soql`
package pins AST shapes to prevent silent drift.

---

## Development Phases

### Phase 0 — Monorepo Scaffold (Complete)

Root toolchain setup: pnpm workspaces, Turborepo, Biome, Husky + lint-staged +
commitlint, changeset config, CI workflows, skeleton package.json files for all
packages.

### Phase 1 — `@soda3js/soql` (Complete, v0.0.1)

Pure TypeScript SoQL query builder with 138 tests at strict coverage. Publishes
`v0.0.1`. All Tier 1 SoQL functions implemented. Dual output (URL params +
POST body SQL) from a single immutable AST.

### Phase 2 — `@soda3js/protocol` + `@soda3js/client` + `@soda3js/rest` (Complete)

Wire-format type contracts, Effect service library, and batteries-included REST
client. Target milestone: publish `v0.0.2`.

- **Phase 2a:** `protocol` — plain TS interfaces, scaffold only
- **Phase 2b:** `client` — `SodaClient` Context.Tag, schemas, TaggedErrors,
  layers, endpoints (query, queryAll, metadata, export), pagination via
  `Stream.paginateChunkEffect`, metrics, redaction
- **Phase 2c:** `rest` — platform entries (node, bun, browser), Promise-based
  `Soda3Client` class, conditional exports

### Phase 3 — `@soda3js/server` + `@soda3js/api` Test Infrastructure (Pending)

Private packages enabling integration tests. `api` implements route handlers,
in-memory engine, and auth middleware. `server` wraps `api` with replay
(fixture-based) and fault injection (429, 401, timeouts) capabilities.

### Phase 4 — `@soda3js/cli` Terminal Client (Pending)

`@effect/cli`-based terminal client published as the `soda3` binary. TOML
profile management, structured query options, multiple output formats (table,
JSON, ndjson, CSV, GeoJSON), and TTY auto-detection.

### Phase 5 — Full Release v0.1.0 (Pending)

Documentation site, Tier 3 SoQL functions (geospatial, regression, type
casting), SQLite and Postgres backends for `api`, `@soda3js/api` added to the
fixed-versioning group and published.

---

**Document Status:** Current — reflects Phase 1 and Phase 2 complete.
Phase 2 implemented on `feat/client` branch.

**Next update:** When Phase 3 packages (server, api) begin implementation.
