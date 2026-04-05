---
status: current
module: rest
category: architecture
created: 2026-04-04
updated: 2026-04-05
last-synced: 2026-04-04
completeness: 80
related:
  - ../architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/rest - Architecture

Batteries-included REST client for the Socrata SODA3 API. Bundles all platform
dependencies so consumers do not need Effect knowledge or peer dependency
management.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [Subpath Export Strategy](#subpath-export-strategy)
5. [Soda3Client Class](#soda3client-class)
6. [Platform Entries](#platform-entries)
7. [Dependency Model](#dependency-model)
8. [Testing Strategy](#testing-strategy)
9. [Future Work](#future-work)

---

## Overview

`@soda3js/rest` is the batteries-included entry point for consumers who want a
Promise-based API without Effect knowledge. It wraps the Effect-based
`@soda3js/client` in a class-based interface and bundles all platform
dependencies as fixed (not peer) deps.

The package has no main `"."` export. Consumers import from one of three
subpath exports corresponding to their runtime: `@soda3js/rest/node`,
`@soda3js/rest/bun`, or `@soda3js/rest/browser`.

---

## Current State

The package is fully implemented with four source files:

```text
packages/rest/src/
  soda3-client.ts    # Soda3Client class (platform-agnostic core)
  node.ts            # Node.js entry (NodeHttpClient.layerUndici)
  bun.ts             # Bun entry (FetchHttpClient.layer)
  browser.ts         # Browser entry (FetchHttpClient.layer)
```

The `Soda3Client` class exposes `query()`, `queryAll()`, and `metadata()`
as Promise-returning methods. Each platform entry point re-exports
`Soda3Client` pre-wired with the appropriate `HttpClient` layer.

---

## Rationale

### Why Separate `rest` from `client`

The split serves two distinct consumer populations:

- **Effect consumers** (CLI, enterprise integrations) want `@soda3js/client`
  with peer dependencies so they control the Effect version, compose their
  own layers, and wire custom observability backends.
- **Casual consumers** want `npm install @soda3js/rest/node` and a Promise
  API with zero configuration.

If platform adapters lived in `client`, every consumer would pull in Node
and Bun platform packages even if they only target the browser. Separating
`rest` from `client` keeps `client` platform-agnostic.

### No Main Export

The package intentionally omits a `"."` export. Importing from
`@soda3js/rest` directly would be ambiguous -- which platform's `HttpClient`
should be used? Forcing consumers to choose `./node`, `./bun`, or `./browser`
makes the platform selection explicit and prevents runtime errors from
incorrect platform resolution.

### Class Wrapper Pattern

`Soda3Client` is a thin class that:

1. Accepts a config object (`{ domain, appToken?, mode? }`) in the constructor
2. Builds a `SodaClientConfig` and a composed `Layer<SodaClient>` internally
3. Runs Effect programs via `Effect.runPromise` behind each method call

This hides all Effect machinery from Promise-based consumers while preserving
full type safety on return types.

---

## Subpath Export Strategy

The `package.json` exports field:

```json
{
  "exports": {
    "./node": "./src/node.ts",
    "./bun": "./src/bun.ts",
    "./browser": "./src/browser.ts"
  }
}
```

Each entry point imports `Soda3Client` from `soda3-client.ts` and re-exports
it with the platform-specific `HttpClient` layer pre-applied. The
`rslib-builder` rewrites these paths to built artifacts at publish time.

---

## Soda3Client Class

The core class in `soda3-client.ts`:

- Constructor takes `Soda3ClientConfig` (domain, optional appToken, optional
  mode) and an optional `platformLayer` parameter defaulting to
  `FetchHttpClient.layer`
- Captures `domain` for use in all method calls
- Builds a composed `Layer<SodaClient>` from `SodaClientLive` and the
  platform layer
- Exposes methods:
  - `query(datasetId, options?)` -- returns `Promise<ReadonlyArray<Record>>`
  - `queryAll(datasetId, options?)` -- returns `Promise<ReadonlyArray<Record>>`
    (collects the paginated stream)
  - `metadata(datasetId)` -- returns `Promise<DatasetMetadata>`

**QueryOptions parsing:** The `orderBy` option in `QueryOptions` accepts
strings in `"column:DIR"` format (e.g., `"population:DESC"`). A
`parseOrderBy` helper splits these into separate column and direction
arguments for the SoQL builder's `.orderBy(column, direction)` call.

Each method internally runs an Effect program against the composed layer via
`Effect.runPromise`.

---

## Platform Entries

### `node.ts`

Imports `NodeHttpClient.layerUndici` from `@effect/platform-node` and
re-exports `Soda3Client` constructed with this layer. Suitable for Node.js
18+ environments using the built-in undici HTTP client.

### `bun.ts`

Imports `FetchHttpClient.layer` from `@effect/platform`. Bun's native
`fetch` is automatically used as the underlying transport.

### `browser.ts`

Imports `FetchHttpClient.layer` from `@effect/platform`. Uses the browser's
native `fetch` API.

---

## Dependency Model

All dependencies are fixed (not peer):

| Dependency | Purpose |
| --- | --- |
| `@soda3js/client` | Effect service library (core logic) |
| `@soda3js/soql` | SoQL query builder (re-exported for convenience) |
| `effect` | Effect runtime |
| `@effect/platform` | HttpClient, FetchHttpClient |
| `@effect/platform-node` | NodeHttpClient (for `./node` entry) |

This means `npm install @soda3js/rest` resolves everything. Consumers never
need to manually install Effect packages.

---

## Testing Strategy

Tests for `rest` focus on the class wrapper and platform wiring:

- Verify `Soda3Client` methods return correct Promise types
- Verify each platform entry point exports a functional `Soda3Client`
- Integration tests (Phase 3, with `@soda3js/server`) will verify end-to-end
  HTTP calls through the class wrapper

The underlying Effect logic is tested in `@soda3js/client`'s test suite.

---

## Future Work

- Add `export_()` method to `Soda3Client` for file download support
- Add streaming query method that yields rows incrementally (AsyncIterable)
- Add request/response interceptor hooks for custom middleware
- Consider a `Soda3Client.create()` static factory as an alternative to
  `new Soda3Client()`

---

**Document Status:** Current -- all planned Phase 2 functionality implemented
on `feat/client` branch.

**Next Update:** When additional `Soda3Client` methods or streaming APIs are
added.
