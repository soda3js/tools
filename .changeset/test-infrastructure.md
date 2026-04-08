---
"@soda3js/client": patch
---

## Tests

- Fixture population script using TestServer record mode against live Socrata portals
- Client integration tests (round-trip, error handling, export) against TestServer replay
- REST integration tests for Soda3Client against TestServer
- CLI integration tests spawning binary against TestServer
- E2E tests against live SF Films, NYC 311, and Chicago Crimes portals
- Weekly E2E CI workflow with manual dispatch and PR label triggers
