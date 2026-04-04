---
status: current
module: protocol
category: architecture
created: 2026-04-04
updated: 2026-04-04
last-synced: 2026-04-04
completeness: 85
related:
  - ../architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/protocol - Architecture

Plain TypeScript interfaces for SODA3 API wire formats. Zero dependencies.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [Exported Interfaces](#exported-interfaces)
5. [Consumer Packages](#consumer-packages)
6. [Testing Strategy](#testing-strategy)
7. [Future Work](#future-work)

---

## Overview

`@soda3js/protocol` is a leaf package in the soda3js monorepo alongside `soql`.
It defines plain TypeScript interfaces that describe the shape of raw JSON
responses from Socrata SODA API endpoints. The package has zero runtime
dependencies and exports only `interface` and `type` declarations -- no
runtime code.

The package exists so that `@soda3js/client` (which decodes API responses) and
`@soda3js/api` (which produces API responses) can agree on wire-format shapes
without importing each other or pulling in any shared runtime dependency.

---

## Current State

The package is fully implemented with three source files:

```text
packages/protocol/src/
  index.ts       # re-exports all interfaces
  metadata.ts    # dataset metadata, column, and owner shapes
  errors.ts      # SODA error response shape
```

All interfaces mirror the raw JSON field names from the Socrata API. The
package is published alongside other soda3js packages.

---

## Rationale

### Zero-Dependency Constraint

The protocol package must remain a pure type leaf with zero runtime
dependencies. This constraint exists because:

- Both `client` (Effect-based, browser/Node/Bun) and `api` (Bun-native)
  import from it. Any runtime dependency would leak into both consumers.
- Type-only packages have zero bundle impact when tree-shaken.
- The package can safely appear in any position in the dependency graph
  without creating version conflicts.

### Interfaces over Classes

The package uses plain `interface` declarations rather than `Schema.Class` or
any runtime construct. This separates the wire-format contract (what the API
sends) from the validation logic (how consumers decode it). `@soda3js/client`
provides the Effect Schema classes that decode from these interface shapes.

### Field Name Conventions

Interface field names match the Socrata API response JSON exactly. Where the
API uses camelCase (`fieldName`, `dataTypeName`), the interfaces use
camelCase. This avoids a mapping layer between raw JSON and the type contract.

---

## Exported Interfaces

### From `metadata.ts`

#### ColumnShape

Describes a single column in a dataset metadata response.

Fields: `id` (number), `fieldName` (string), `dataTypeName` (string),
`description` (optional string), `renderTypeName` (string), `position`
(number).

#### OwnerShape

Describes the dataset owner.

Fields: `id` (string), `displayName` (string).

#### DatasetMetadataShape

Describes the full response from `GET /api/views/:id.json`.

Fields: `id`, `name`, `description` (optional), `assetType` (optional),
`category` (optional), `tags` (optional string array), `columns`
(`ColumnShape[]`), `owner` (`OwnerShape`), `rowsUpdatedAt` (number),
`viewLastModified` (number).

### From `errors.ts`

#### SodaErrorResponseShape

Describes all SODA API error responses.

Fields: `code` (string), `error` (literal `true`), `message` (string),
`data` (optional unknown).

---

## Consumer Packages

### `@soda3js/client` (decodes)

The client package imports protocol interfaces as decode targets for its
Effect `Schema.Class` types. `DatasetMetadata`, `Column`, `Owner`, and
`SodaErrorResponse` in `client/src/schemas/` decode from the corresponding
protocol shapes. The client validates incoming JSON against these schemas at
runtime.

### `@soda3js/api` (produces)

The API server package (Phase 3, pending) will import protocol interfaces to
type its response builders. Route handlers will construct objects satisfying
`DatasetMetadataShape` and `SodaErrorResponseShape`, ensuring wire-format
compatibility with what the client expects to decode.

---

## Testing Strategy

Protocol interfaces are tested at the type level rather than at runtime:

- The `@soda3js/client` schema tests (`schemas.test.ts`) decode raw JSON
  through `Schema.decodeUnknown` using objects that conform to protocol
  interface shapes. If the interfaces drift from reality, these tests fail.
- When `@soda3js/api` is implemented, its response builders will be typed
  against protocol interfaces, providing compile-time verification from the
  producer side.

No standalone runtime tests exist in the protocol package because there is no
runtime code to test.

---

## Future Work

- Add interfaces for SODA3 POST request body shapes (query payload)
- Add interfaces for export endpoint response headers (content-disposition,
  content-type)
- Add interfaces for SODA3 pagination metadata (page count, total rows) if
  the API exposes these in response headers or body

---

**Document Status:** Current -- all planned Phase 2 interfaces implemented.

**Next Update:** When Phase 3 adds API server response types or new wire
formats are identified.
