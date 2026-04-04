---
"@soda3js/client": minor
---

## Features

### Adds @soda3js/client Package

- Add Effect service library for querying Socrata open data portals.
- SodaClient Context.Tag with four endpoints: query (single-page), queryAll (Stream-based pagination), metadata, and export. Dual-mode SODA2 GET and SODA3 POST dispatch with per-domain token resolution.
- Six typed errors (SodaAuthError, SodaQueryError, SodaNotFoundError, SodaServerError, SodaRateLimitError, SodaTimeoutError). Five Schema.Class types for config and response validation. Effect Metric constants for observability and URL/header redaction utilities. Platform-agnostic with a single export entry point.
