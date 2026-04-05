---
status: current
module: server
category: architecture
created: 2026-04-04
updated: 2026-04-04
last-synced: 2026-04-04
completeness: 85
related:
  - ../rest/architecture.md
  - ../client/architecture.md
dependencies: []
---

# @soda3js/server - Architecture

Private replay/record/chaos test server for SODA3 API integration testing.
Not published to npm. Provides fixture-based HTTP replay with deterministic
fault injection and optional recording proxy for capturing live responses.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Entry Points](#entry-points)
6. [Request Pipeline](#request-pipeline)
7. [Fixture Format](#fixture-format)
8. [Modes of Operation](#modes-of-operation)
9. [Fault Injection](#fault-injection)
10. [Testing Strategy](#testing-strategy)
11. [Future Work](#future-work)

---

## Overview

`@soda3js/server` is an internal (private, unpublished) package that provides
a lightweight HTTP test server for integration testing across the soda3js
monorepo. It serves recorded SODA3 API responses from disk fixtures, can proxy
to real Socrata portals to record new fixtures, and supports deterministic and
random fault injection for resilience testing.

The server has two consumer-facing entry points: a Vitest plugin
(`ServerPlugin`) that ties server lifecycle to test runs, and a standalone API
(`TestServer.create()`) for ad-hoc or Docker-based usage.

---

## Current State

The package is fully implemented with 12 source files:

```text
packages/server/src/
  index.ts              Public exports (ServerPlugin, TestServer, types)
  plugin.ts             Vitest 4.1+ plugin with configureVitest hook
  server.ts             TestServer class with create()/close()
  standalone.ts         Docker entrypoint reading env vars
  lib/
    types.ts            FixtureEnvelope, FixtureIndex, FaultRule, ChaosConfig, etc.
    fixture-loader.ts   loadFixtures(), hashBody()
    request-matcher.ts  matchRequest()
    fault-injector.ts   createFaultInjector()
    chaos.ts            createChaosMonkey() with seeded PRNG
    fixture-writer.ts   writeFixture() with token redaction
    http-server.ts      startHttpServer() with 5-step pipeline
    recorder.ts         recordAndSave() HTTPS proxy
```

Test suite: 36 tests total (27 unit, 9 integration) covering all modules.

---

## Rationale

### Why Node.js, Not Bun

The monorepo uses pnpm workspaces. Bun's built-in HTTP server (`Bun.serve`)
would require running tests with the Bun runtime, which creates workspace
resolution conflicts with pnpm. Using plain Node `http.createServer` keeps
the test server compatible with the standard `pnpm test` workflow and avoids
a second runtime dependency.

### Why Vitest Plugin, Not Docker-First

A Vitest plugin ties server lifecycle to test runs automatically. The plugin
starts the server before tests and shuts it down after. This eliminates manual
setup/teardown, port management, and container orchestration for the common
case (local development and CI). The standalone entry point and Docker support
exist for edge cases (long-running dev servers, isolated environments) but are
not the primary integration path.

### Why Replay-First, Not Engine-First

Building a SoQL query engine that interprets queries against fixture data
would be complex and fragile. Instead, the server matches requests by
method + path + body hash and replays recorded responses verbatim. This is
simpler, faster, and more reliable for integration testing where the goal is
to verify client behavior against known API responses, not to test query
semantics.

### Why No Effect

The server is a test utility, not a production service. Plain Node APIs
(`http`, `fs`, `crypto`) keep the implementation simple with zero runtime
dependencies. Effect would add complexity without proportional benefit for
a package that is never published or used in production paths.

### @soda3js/api Shelved

The original plan included `@soda3js/api` as a Bun-native SODA3 server
framework. This has been shelved indefinitely in favor of the simpler
replay-based test server, which satisfies integration testing needs without
requiring a full query engine.

---

## System Architecture

The server is structured as a pipeline of composable concerns:

```text
                    +------------------+
                    |  Entry Points    |
                    |  (plugin.ts /    |
                    |   server.ts /    |
                    |   standalone.ts) |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | startHttpServer  |
                    | (http-server.ts) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
     +----------------+ +----------+ +-------------+
     | fixture-loader | | fault-   | | chaos       |
     | loadFixtures() | | injector | | monkey      |
     +----------------+ +----------+ +-------------+
              |              |              |
              v              v              v
     +----------------+ +----------+ +-------------+
     | request-matcher| | recorder | | fixture-    |
     | matchRequest() | |          | | writer      |
     +----------------+ +----------+ +-------------+
```

All library modules are pure functions or factory functions returning
closures. There is no shared mutable state beyond the request counter
in `startHttpServer`.

---

## Entry Points

### ServerPlugin (plugin.ts)

A Vitest 4.1+ plugin using the `configureVitest` hook. Starts the HTTP
server before any tests run, injects the server URL into both
`process.env.SODA3_TEST_SERVER` and Vitest's `provide` config (accessible
via `inject("soda3TestServer")` in test files). Shuts down the server when
Vitest closes.

### TestServer (server.ts)

A class-based standalone API. `TestServer.create(options)` is an async
factory that starts the server and returns a `TestServer` instance with
`url`, `port`, `requestCount`, and `close()`. Suitable for programmatic
use outside Vitest (scripts, Docker containers, other test frameworks).

### standalone.ts

A Docker/CLI entrypoint that reads configuration from environment variables
and starts a long-running server process. Intended for containerized test
environments where the server runs independently of the test framework.

---

## Request Pipeline

Every incoming HTTP request passes through a 5-step pipeline in
`startHttpServer()`:

1. **Auth check** -- If `auth.required` is set, validates the `X-App-Token`
   header. Returns 401 on mismatch.

2. **Deterministic faults** -- If `faults` rules are configured, checks the
   parsed request against each rule. Matching rules inject specific HTTP
   errors, connection resets, or delays. Rules support `after` counters
   (fault only after N successful requests) and `without_auth` guards.

3. **Chaos faults** -- If mode is `chaos` and `chaos.enabled`, the chaos
   monkey randomly decides whether to inject a fault based on `probability`.
   Uses a seeded PRNG for reproducible test runs. Fault selection is
   weighted.

4. **Record proxy** -- If mode is `record` and no fixture matches the
   request, proxies to the real Socrata portal via HTTPS. The response is
   saved as a new fixture (envelope JSON + body file) with app tokens
   redacted. The fixture index is reloaded after recording.

5. **Replay** -- Matches the request against loaded fixtures by
   method + path + body hash. Returns the fixture's recorded response
   (status, headers, body file). Returns 404 if no fixture matches.

The pipeline short-circuits at the first step that produces a response.

---

## Fixture Format

Fixtures are stored as pairs of files: an envelope JSON file containing
request/response metadata and a separate body file in native format.

### Envelope (JSON)

```json
{
  "dataset_id": "abcd-1234",
  "portal": "data.cityofchicago.org",
  "recorded_at": "2026-04-04T12:00:00Z",
  "latency_ms": 150,
  "auth": { "required": false, "token_used": false },
  "request": {
    "method": "GET",
    "path": "/resource/abcd-1234.json",
    "headers": {},
    "body": null
  },
  "response": {
    "status": 200,
    "content_type": "application/json",
    "headers": { "x-soda2-types": "[\"text\",\"number\"]" },
    "body_file": "abcd-1234.body.json"
  }
}
```

### Body Files

Response bodies are stored separately in their native format (`.json`,
`.csv`, `.geojson`) for human readability and easy diffing. The
`body_file` field in the envelope points to the body file relative to
the fixture directory.

### Request Matching

`matchRequest()` builds a lookup key from `method + path + bodyHash`.
The `bodyHash` is a SHA-256 digest of the stringified request body (or
empty string for GET requests). A fallback match by path-only is used
when the exact key misses, supporting requests where the body varies
between test runs.

---

## Modes of Operation

### Replay (Default)

Serves responses from pre-recorded fixtures. No network access required.
This is the standard mode for CI and local development. If a request has
no matching fixture, the server returns 404.

### Record

Proxies unmatched requests to a real Socrata portal, records the response
as a new fixture, and then serves it. Matched requests are served from
existing fixtures (cache-hit). Requires `SOCRATA_APP_TOKEN` environment
variable. App tokens are redacted from recorded fixtures.

### Chaos

Extends replay mode with random fault injection. The chaos monkey uses a
configurable probability and weighted fault selection to randomly inject
errors, timeouts, or connection resets. A seeded PRNG ensures
reproducibility across test runs.

---

## Fault Injection

### Deterministic Faults (FaultRule)

Configured via the `faults` option. Each rule specifies a `match` pattern
(matched against the request path), a fault type (`status`, `timeout`,
or `reset`), optional `delay_ms`, and optional `after` counter. Rules
are evaluated in order; the first match wins.

### Chaos Faults (ChaosConfig)

Configured via the `chaos` option. When enabled, every request has a
`probability` chance of being faulted. Available fault types are the
same as deterministic faults but selected randomly with configurable
weights. Optional `latency` range adds random delay to all responses
(faulted or not).

---

## Testing Strategy

The test suite has 36 tests organized by module:

- **Unit tests (27):** `fixture-loader`, `request-matcher`,
  `fault-injector`, `chaos`, `fixture-writer` -- each module tested in
  isolation with minimal fixtures
- **Integration tests (9):** Full server lifecycle tests covering replay
  mode, record mode (with mocked upstream), and the Vitest plugin

All tests use the standard `@savvy-web/vitest` configuration and run
with `pnpm test`. Fixtures for the tests themselves live in
`packages/server/__fixtures__/`.

---

## Future Work

- Expand fixture coverage as more client/rest integration tests are added
- Add fixture validation CLI command for checking fixture directory health
- Support pagination sequences (multi-fixture responses for paginated queries)
- Add metrics/logging endpoint for observing server behavior during test runs
- Consider WebSocket support if future SODA3 streaming APIs require it

---

**Document Status:** Current -- all planned server functionality implemented
on `feat/cli` branch.

**Next Update:** When integration tests in `@soda3js/rest` or `@soda3js/cli`
begin exercising the server and new fixture patterns emerge.
