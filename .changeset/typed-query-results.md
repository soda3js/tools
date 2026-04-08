---
"@soda3js/client": minor
"@soda3js/rest": minor
---

## Features

### Typed Query Results

- `SodaClient.query()` accepts optional `{ schema }` parameter for Effect Schema validation of result rows
- `SodaParseError` typed error surfaced when schema validation fails
- `Soda3Client.execute()` accepts a SoQLBuilder directly for fluent query-to-execution workflows
