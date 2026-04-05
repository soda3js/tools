---
"@soda3js/server": minor
---

## Features

### Adds @soda3js/server Package

Add replay/record/chaos test server for integration testing against Socrata SODA3 fixtures.

### Fixture-based replay

`TestServer` loads recorded fixture envelopes from disk and replays matching responses by method, path, and POST body hash. Fixtures use a split envelope+body format for human-readable diffs. Supports JSON, CSV, and GeoJSON response bodies.

### Record mode

Proxies cache-miss requests to a live Socrata portal over HTTPS, records the response as a new fixture envelope+body pair, and reloads the fixture index. Query parameters are forwarded. Auth tokens are redacted before writing.

### Deterministic fault injection

`FaultRule` array injects status codes, timeouts, or connection resets on matching request paths. Supports glob patterns, `after` count thresholds, and `without_auth` guards for testing error-handling code paths.

### Seeded chaos monkey

Configurable probability-based fault injection with weighted fault selection and a seeded PRNG (mulberry32) for reproducible test runs. Supports status faults, timeouts, connection resets, and latency jitter.

### Vitest plugin

`ServerPlugin` integrates with `configureVitest` lifecycle, injects `SODA3_TEST_SERVER` env var and `soda3TestServer` provide key, and returns a teardown function for reliable cleanup.

### Standalone entry and Docker

`standalone.ts` entry script for running the server outside Vitest. Dockerfile for containerized fixture replay. Configurable via `SODA3_SERVER_MODE`, `SODA3_SERVER_PORT`, `SODA3_FIXTURES_PATH`, and chaos/record env vars.
