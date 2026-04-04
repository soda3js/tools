# @soda3js/protocol

Plain TypeScript interfaces and runtime type guards for SODA3 API wire
formats. Zero dependencies -- leaf package alongside `soql`.

## Structure

- `metadata.ts` -- Dataset metadata response shape, column definitions,
  owner info
- `errors.ts` -- SODA3 error response shape
- `guards.ts` -- Runtime type guards for structural validation
  (`isDatasetMetadataShape`, `isColumnShape`, `isOwnerShape`,
  `isSodaErrorResponseShape`)
- `index.ts` -- Re-exports all interfaces and guards

## Usage

Import interfaces for type-only annotations or guards for runtime
validation. These types mirror raw JSON responses from Socrata
endpoints before any Effect Schema validation. `@soda3js/client`
schemas are the validated counterparts.

## Conventions

- No dependencies allowed; keep this package a pure type/guard leaf
- Interfaces are type-only exports; guards are the only runtime code
- Mirror field names from the Socrata API exactly (camelCase where
  the API uses camelCase, snake_case where it uses snake_case)
