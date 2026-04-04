# @soda3js/client

## 0.1.0

### Features

* [`0f75a80`](https://github.com/soda3js/tools/commit/0f75a80c0a20d71521920325e75f6938b2303330) ### Adds @soda3js/client Package

- Add Effect service library for querying Socrata open data portals.
- SodaClient Context.Tag with four endpoints: query (single-page), queryAll (Stream-based pagination), metadata, and export. Dual-mode SODA2 GET and SODA3 POST dispatch with per-domain token resolution.
- Six typed errors (SodaAuthError, SodaQueryError, SodaNotFoundError, SodaServerError, SodaRateLimitError, SodaTimeoutError). Five Schema.Class types for config and response validation. Effect Metric constants for observability and URL/header redaction utilities. Platform-agnostic with a single export entry point.

### Patch Changes

| Dependency    | Type       | Action  | From  | To    |
| ------------- | ---------- | ------- | ----- | ----- |
| @soda3js/soql | dependency | updated | 0.0.0 | 0.1.0 |
