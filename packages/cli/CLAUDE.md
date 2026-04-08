# @soda3js/cli

Terminal client for the Socrata SODA3 API. Binary: `soda3`. Built with
`@effect/cli` for argument parsing and Ink (React) for rich terminal output.

## Architecture

- `cli/index.ts` -- Entry point. Registers root command with 6 subcommands,
  bootstraps `NodeContext`, runs via `NodeRuntime.runMain`.
- `cli/commands/` -- 6 subcommands:
  - `query` -- execute SoQL queries against a dataset
  - `export` -- stream dataset exports (csv/json/tsv)
  - `meta` -- fetch and display dataset metadata
  - `search` -- Discovery API search across all Socrata portals
  - `config` -- init/show/edit config file (`Soda3Config`)
  - `cache` -- cache management (clear, stats)
- `ui/` -- Ink (React) components for rich terminal output:
  - `Table.tsx` -- tabular data display
  - `SearchResults.tsx` -- Discovery API search results
  - `MetadataView.tsx` -- dataset metadata display
  - `ErrorView.tsx` -- error formatting
  - `Spinner.tsx` -- loading indicator
  - `render.ts` -- `renderInk()` lazy loader (dynamic import of ink/react
    to avoid process-level side effects), `isTTY()` check
- `lib/` -- shared utilities:
  - `domain.ts` -- domain resolution from profile/flag/env
  - `output.ts` -- output formatting (JSON/table/plain)
  - `cache-factory.ts` -- cache store factory for CLI commands
- `index.ts` -- public API re-exports (non-CLI consumers)

**For detailed architecture:**
`@./.claude/design/cli/architecture.md`

Load when modifying command structure, Ink components, or config integration.

## Config Integration

- Uses `@soda3js/config` for profile-based domain/token resolution
- `config init` creates `~/.config/soda3js/config.toml` with a default profile
- `config show` displays current config; `config edit` opens in `$EDITOR`
- All commands resolve domain from: `--domain` flag > default profile > env

## Ink / JSX Runtime

- Uses Ink 6 + React 19 for terminal UI rendering
- `@rsbuild/plugin-react` provides automatic JSX runtime at build time
- `renderInk()` dynamically imports `ink` and `react` to avoid side
  effects during testing -- never import ink at module scope
- `isTTY()` gates rich output; falls back to plain JSON when piped

## Dependencies

Runtime: `@effect/cli`, `@effect/platform`, `@effect/platform-node`,
`@soda3js/client`, `@soda3js/config`, `@soda3js/soql`, `@soda3js/cache-fs`,
`effect`, `ink`, `react`.

## Key Patterns

- **Effect-based commands:** Each command handler is an `Effect.Effect`
  program provided to `@effect/cli`
- **Lazy Ink rendering:** `renderInk(factory)` returns an Effect that
  dynamically imports React/Ink -- keeps tests fast and side-effect-free
- **Profile resolution:** Domain and token come from config profiles,
  with `--domain` / `--token` CLI flags as overrides

## Testing

Tests in `__test__/`. Command handlers export testable functions.
Run: `pnpm test` from repo root.
