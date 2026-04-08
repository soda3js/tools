# @soda3js/server

Replay, record, and chaos test server for the [Socrata SODA3 API](https://dev.socrata.com/). Replays fixture files for deterministic integration tests. Ships with a Vitest plugin for zero-config setup.

This package is private and not published to npm. It is used internally for integration testing across the soda3js monorepo.

## Vitest Plugin

The recommended way to use the test server. The plugin starts the server before tests run and shuts it down after.

```typescript
// vitest.config.ts
import { ServerPlugin } from "@soda3js/server";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    ServerPlugin({
      fixtures: "__fixtures__/datasets",
      mode: "replay",
    }),
  ],
});
```

The server URL is injected as `process.env.SODA3_TEST_SERVER` and via Vitest's `provide` mechanism as `soda3TestServer`.

## Standalone API

For use outside of Vitest or when you need direct control over the server lifecycle.

```typescript
import { TestServer } from "@soda3js/server";

const server = await TestServer.create({
  fixtures: "__fixtures__/datasets",
  mode: "replay",
  port: 0, // random available port
});

console.log(server.url);           // "http://localhost:54321"
console.log(server.port);          // 54321
console.log(server.requestCount);  // 0

// ... run tests against server.url ...

await server.close();
```

## Server Modes

| Mode | Description |
| --- | --- |
| `replay` | Match incoming requests to fixture files and replay recorded responses |
| `record` | Proxy requests to a live Socrata portal and save fixtures |
| `chaos` | Inject random faults (errors, latency, timeouts) for resilience testing |

## Configuration

### ServerOptions

```typescript
interface ServerOptions {
  fixtures: string;           // Path to fixture directory
  mode?: "replay" | "record" | "chaos";
  port?: number;              // 0 for random
  auth?: {
    required: boolean;
    token: string;
  };
  faults?: FaultRule[];       // Deterministic fault injection
  chaos?: ChaosConfig;       // Random fault injection
  record?: {
    portal: string;           // Target portal (e.g. "data.sfgov.org")
    fixtures: string;         // Output directory for recorded fixtures
    overwrite?: boolean;
  };
}
```

### Fault Rules

Inject specific faults for matching request paths.

```typescript
const server = await TestServer.create({
  fixtures: "__fixtures__/datasets",
  faults: [
    { match: "/resource/yitu-d5am", status: 429, delay_ms: 100 },
    { match: "/resource/invalid-id", status: 404 },
    { match: "/resource/timeout-test", type: "timeout" },
  ],
});
```

### Chaos Config

Random fault injection with weighted probability.

```typescript
const server = await TestServer.create({
  fixtures: "__fixtures__/datasets",
  mode: "chaos",
  chaos: {
    enabled: true,
    probability: 0.3,
    seed: 42,
    faults: [
      { status: 500, weight: 2 },
      { status: 429, weight: 1 },
      { type: "timeout", weight: 1 },
    ],
    latency: { min_ms: 50, max_ms: 200 },
  },
});
```

## Fixture Format

Each recorded API response is stored as a pair of files:

- **Envelope** (`.json`): Request/response metadata including path, headers, status, auth, and latency
- **Body** (`.json` / `.csv`): The raw response body

```json
{
  "dataset_id": "yitu-d5am",
  "portal": "data.sfgov.org",
  "recorded_at": "2026-04-01T00:00:00Z",
  "latency_ms": 150,
  "auth": { "required": false, "token_used": false },
  "request": {
    "method": "GET",
    "path": "/resource/yitu-d5am.json",
    "headers": {},
    "body": null
  },
  "response": {
    "status": 200,
    "content_type": "application/json",
    "headers": {},
    "body_file": "yitu-d5am-body.json"
  }
}
```

## License

[MIT](./LICENSE)
