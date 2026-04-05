---
"@soda3js/cli": minor
---

## Features

### Adds @soda3js/cli Package

Initial release of `@soda3js/cli` — a terminal client for querying Socrata open data portals, published as the `soda3` binary. Built with `@effect/cli` and uses `@soda3js/client` directly (not `@soda3js/rest`).

### Commands

Four top-level commands are available:

- **`soda3 query <dataset-id>`** — Query a dataset with structured options (`--select`, `--where`, `--limit`, `--offset`, `--order`) or a raw SoQL string via `--q`. When `--q` is provided it takes precedence and all structured options are ignored.
- **`soda3 export <dataset-id>`** — Export a full dataset as CSV or JSON (`--format csv|json`). Output goes to stdout by default or to a file via `--output`.
- **`soda3 meta <dataset-id>`** — Fetch and display dataset metadata. Renders a summary header and column table in the default `table` format, or raw JSON with `--format json`.
- **`soda3 config`** — Manage the TOML config file via four subcommands: `init`, `show`, `edit`, `add-profile`.

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

| Format | Description |
| :--- | :--- |
| `table` | Aligned text table with Unicode box-drawing characters |
| `json` | Pretty-printed JSON array |
| `ndjson` | Newline-delimited JSON (one object per line) |
| `csv` | RFC-style CSV with header row |

When `--format` is omitted, the format is auto-detected: non-TTY output (piped) defaults to `ndjson`; TTY output defaults to `table` for 50 rows or fewer and `json` for larger result sets.
