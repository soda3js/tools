# @soda3js/protocol

Plain TypeScript interfaces for SODA3 API wire formats. Zero
dependencies -- leaf package alongside `soql`.

## Structure

- `metadata.ts` -- Dataset metadata response shape, column definitions,
  owner info
- `errors.ts` -- SODA3 error response shape
- `index.ts` -- Re-exports all interfaces

## Usage

Import interfaces for type-only annotations. These types mirror raw
JSON responses from Socrata endpoints before any Effect Schema
validation. `@soda3js/client` schemas are the validated counterparts.

## Conventions

- Export only `interface` and `type` declarations -- no runtime code
- No dependencies allowed; keep this package a pure type leaf
- Mirror field names from the Socrata API exactly (camelCase where
  the API uses camelCase, snake_case where it uses snake_case)
