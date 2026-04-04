# @soda3js/client

Platform-agnostic Effect service library for the Socrata SODA3 API.
Single entry point (`./src/index.ts`). Peers: `effect`, `@effect/platform`.

## Architecture

Layered module structure:

- `services/SodaClient.ts` -- Effect service tag with static methods:
  `query`, `queryAll`, `metadata`, `export`
- `endpoints/` -- Effect implementations for each SodaClient method
  (query, queryAll, metadata, export, map-response-error)
- `schemas/` -- Effect Schema models (SodaClientConfig, DatasetMetadata,
  Column, Owner, SodaErrorResponse)
- `errors/` -- Typed Effect errors (SodaAuthError, SodaNotFoundError,
  SodaQueryError, SodaRateLimitError, SodaServerError, SodaTimeoutError)
- `layers/SodaClientLive.ts` -- Live layer wiring endpoints to service tag
- `utils/` -- metrics (4 Effect Metric constants), redact (URL/header
  redaction), mode (query mode detection), pagination

Platform entry points (node.ts, bun.ts, browser.ts) and `Soda3Client`
class live in `@soda3js/rest`, not here.

**For detailed architecture and data flow:**
`@./.claude/design/client/architecture.md`

Load when modifying endpoints, schemas, error mapping, or layer wiring.

## Key Patterns

- **Static method service:** `SodaClient` uses `Effect.Service` with
  static methods -- call via `SodaClient.query(...)` directly
- **Schema-validated responses:** All API responses decoded through
  Effect Schema with structured parse errors
- **Typed error channel:** Every endpoint returns a union of typed
  Soda errors in the error channel
- **No platform coupling:** Requires `HttpClient` from the Effect
  environment; platform layers provided by `@soda3js/rest`

## Testing

Tests in `__test__/`. Run: `pnpm test` from repo root.

Coverage: strict level via root `vitest.config.ts`.
