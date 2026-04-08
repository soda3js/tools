---
"@soda3js/protocol": minor
"@soda3js/client": minor
"@soda3js/rest": minor
"@soda3js/cli": minor
---

## Features

### Discovery API

Full-stack implementation of the Socrata Discovery API for dataset search across all portals via api.us.socrata.com.

- Protocol: `DiscoveryResultShape`, `CatalogResponseShape` interfaces and `isDiscoveryResultShape`, `isCatalogResponseShape` type guards
- Client: `SodaClient.discover()` with keyword search, domain/category/tag filtering, and pagination
- REST: `Soda3Client.discover()` Promise-based wrapper
- CLI: `soda3 search` command with table/json/ndjson output

### Response Hooks

Optional callback system for tapping into the response pipeline per endpoint. Hooks run after decode, before return, with errors silently caught. Registered via `SodaClientConfig.withHooks()`.
