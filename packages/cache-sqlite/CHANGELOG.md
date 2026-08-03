# @soda3js/cache-sqlite

## 0.1.0

### Features

* ### Adds @soda3js/cache-sqlite Package

  Persistent cache backed by SQLite via `@effect/sql` with automatic schema migrations. Ideal for desktop applications and long-running servers.

  ### Effect SQL integration

  `SqliteCache` Effect Context.Tag with `SqliteCacheLive` Layer. Platform entry point at `@soda3js/cache-sqlite/node` provides `NodeSqliteCacheLive` pre-wired with `@effect/sql-sqlite-node`. Bun entry point available as a placeholder for `@effect/sql-sqlite-bun`.

  ### Schema

  Two tables: `responses` (key, body as BLOB, content type, headers as JSON, timestamps, freshness metadata) and `freshness` (domain, dataset, rowsUpdatedAt, lastChecked, TTL). Indexes on domain, created, and cleanable for efficient pruning. [#55][#55]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/config   | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/protocol | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#55]: https://github.com/soda3js/tools/pull/55
