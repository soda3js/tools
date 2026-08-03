# @soda3js/cli

## 0.1.0

### Features

* ### Adds @soda3js/cli Package

  Initial release of `@soda3js/cli` — a terminal client for querying Socrata open data portals, published as the `soda3` binary. Built with `@effect/cli` and uses `@soda3js/client` directly (not `@soda3js/rest`).

  ### Commands

  Four top-level commands are available:

  * **`soda3 query <dataset-id>`** — Query a dataset with structured options (`--select`, `--where`, `--limit`, `--offset`, `--order`) or a raw SoQL string via `--q`. When `--q` is provided it takes precedence and all structured options are ignored.
  * **`soda3 export <dataset-id>`** — Export a full dataset as CSV or JSON (`--format csv|json`). Output goes to stdout by default or to a file via `--output`.
  * **`soda3 meta <dataset-id>`** — Fetch and display dataset metadata. Renders a summary header and column table in the default `table` format, or raw JSON with `--format json`.
  * **`soda3 config`** — Manage the TOML config file via four subcommands: `init`, `show`, `edit`, `add-profile`.

  ### TOML config store

  Config is stored at `~/.config/soda3js/config.toml` (XDG-compliant: respects `XDG_CONFIG_HOME`). Named profiles each carry a `domain` and an optional `token` for SODA3 app-token mode. A `default_profile` key controls which profile is used when no flag is provided.

  ```toml
  default_profile = "chicago"

  [profiles.chicago]
  domain = "data.cityofchicago.org"
  token  = "your-app-token"

  [profiles.nyc]
  domain = "data.cityofnewyork.us"
  ```

  ### Domain and profile resolution

  Every data command resolves its target domain in priority order:

  1. `--profile <name>` — look up the named profile in config (domain + token)
  2. `--domain <domain>` — use the domain directly with no token (SODA2 mode)
  3. `default_profile` from config — look up the default profile
  4. Error — no domain could be resolved

  ### Output formatters

  The `query` command supports four output formats selectable via `--format`:

  | Format   | Description                                            |
  | :------- | :----------------------------------------------------- |
  | `table`  | Aligned text table with Unicode box-drawing characters |
  | `json`   | Pretty-printed JSON array                              |
  | `ndjson` | Newline-delimited JSON (one object per line)           |
  | `csv`    | RFC-style CSV with header row                          |

  When `--format` is omitted, the format is auto-detected: non-TTY output (piped) defaults to `ndjson`; TTY output defaults to `table` for 50 rows or fewer and `json` for larger result sets. [#54][#54]

- ### Response caching

  * FileSystemCache enabled by default with 5-minute TTL
  * TOML config `[cache]` section with `enabled` and `ttl` fields, plus per-profile overrides under `[profiles.X.cache]`
  * `--no-cache` flag disables caching for a single invocation
  * `--cache-ttl` flag overrides TTL for a single invocation

  ### Cache management commands

  * `soda3 cache status` -- show cache info
  * `soda3 cache inspect <dataset-id>` -- display freshness state and cached queries with SoQL, size, and age
  * `soda3 cache clear` -- wipe cached data (supports `--profile` and `--dataset` scoping)
  * `soda3 cache prune` -- remove stale entries (supports `--max-age` duration like `7d`, `24h`)

  ### Aggregate query support

  * `--group-by` flag accepts comma-separated columns for GROUP BY clauses
  * `--select` now handles function expressions like `count(*)` and `sum(amount)` by wrapping them with SoQL.raw() [#55][#55]

* ### Ink-Based Output Formatting

  Terminal output now uses React Ink components for rich formatting when stdout is a TTY:

  * Aligned column tables with colored headers and smart truncation
  * User-friendly error messages mapping all typed Soda errors
  * Formatted metadata and search result views
  * Automatic fallback to plain text for piped output [#56][#56]

- ### Discovery API

  Full-stack implementation of the Socrata Discovery API for dataset search across all portals via api.us.socrata.com.

  * Protocol: `DiscoveryResultShape`, `CatalogResponseShape` interfaces and `isDiscoveryResultShape`, `isCatalogResponseShape` type guards
  * Client: `SodaClient.discover()` with keyword search, domain/category/tag filtering, and pagination
  * REST: `Soda3Client.discover()` Promise-based wrapper
  * CLI: `soda3 search` command with table/json/ndjson output

  ### Response Hooks

  Optional callback system for tapping into the response pipeline per endpoint. Hooks run after decode, before return, with errors silently caught. Registered via `SodaClientConfig.withHooks()`. [#56][#56]

### Build System

* Added `apiModel.localPaths` to each package's `rslib.config.ts` so that API Extractor copies the generated `.api.json` model into `website/lib/models/<package>/` at build time, feeding the RSPress documentation site's auto-generated API reference pages

### Dependencies

| Dependency        | Type       | Action  | From  | To    |
| ----------------- | ---------- | ------- | ----- | ----- |
| @soda3js/cache-fs | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/client   | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/config   | dependency | updated | 0.0.0 | 0.1.0 |
| @soda3js/soql     | dependency | updated | 0.0.0 | 0.1.0 |

### Patch Changes

Thanks to [@spencerbeggs](https://github.com/spencerbeggs) for their contributions!

[#54]: https://github.com/soda3js/tools/pull/54

[#55]: https://github.com/soda3js/tools/pull/55

[#56]: https://github.com/soda3js/tools/pull/56
